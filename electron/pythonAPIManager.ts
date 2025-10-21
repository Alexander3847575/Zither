import { spawn, type ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';

export class PythonAPIManager {
  private pythonProcess: ChildProcess | null = null;
  private apiUrl = 'http://localhost:8000';
  private isRunning = false;

  async startAPI(): Promise<boolean> {
    try {
      // Check if API is already running
      if (await this.isAPIRunning()) {
        console.log('Python API is already running');
        this.isRunning = true;
        return true;
      }

      // Try to start the Python API
      const pythonPath = await this.findPythonPath();
      if (!pythonPath) {
        throw new Error('Python not found. Please install Python 3.8+ from python.org');
      }

      const apiPath = path.join(process.cwd(), 'backend/api.py');
      const requirementsPath = path.join(process.cwd(), 'backend/requirements.txt');

      // Check if requirements are installed
      if (!await this.checkDependencies(pythonPath, requirementsPath)) {
        throw new Error('Python dependencies not installed. Please run: pip install -r requirements.txt');
      }

      // Start the Python process
      this.pythonProcess = spawn(pythonPath, ['-m', 'uvicorn', 'api:app', '--host', '0.0.0.0', '--port', '8000'], {
        cwd: path.join(process.cwd(), 'backend'),
        stdio: 'pipe'
      });

      // Handle process events
      this.pythonProcess.on('error', (error) => {
        console.error('Failed to start Python API:', error);
        this.isRunning = false;
      });

      this.pythonProcess.on('exit', (code) => {
        console.log(`Python API exited with code ${code}`);
        this.isRunning = false;
      });

      // Wait for API to be ready
      await this.waitForAPI();
      this.isRunning = true;
      console.log('Python API started successfully');
      return true;

    } catch (error) {
      console.error('Failed to start Python API:', error);
      this.isRunning = false;
      return false;
    }
  }

  async stopAPI(): Promise<void> {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isRunning = false;
      console.log('Python API stopped');
    }
  }

  async isAPIRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/docs`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async findPythonPath(): Promise<string | null> {
    const possiblePaths = [
      'python3',
      'python',
      'py', // Windows
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'C:\\Python39\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python311\\python.exe'
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        await execAsync(`"${pythonPath}" --version`);
        return pythonPath;
      } catch {
        continue;
      }
    }
    return null;
  }

  private async checkDependencies(pythonPath: string, requirementsPath: string): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync(`"${pythonPath}" -c "import fastapi, uvicorn, google.generativeai, sklearn, numpy, pandas"`);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForAPI(timeout = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isAPIRunning()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('API failed to start within timeout period');
  }

  async clusterTabs(tabs: any[]): Promise<any[]> {
    if (!this.isRunning) {
      throw new Error('Python API is not running');
    }

    try {
      const response = await fetch(`${this.apiUrl}/cluster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tabs)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  getAPIUrl(): string {
    return this.apiUrl;
  }

  getStatus(): { running: boolean; url: string } {
    return {
      running: this.isRunning,
      url: this.apiUrl
    };
  }
}

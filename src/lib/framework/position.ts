export class Viewport {
    public pixelsX: number;
    public pixelsY: number;
    public aspectRatio: number;

    constructor(pixelsX: number, pixelsY: number) {
        this.pixelsX = pixelsX;
        this.pixelsY = pixelsY;
        this.aspectRatio = pixelsX/pixelsY;
    }   
}

export class Grid {
    private xDivisions: number;
    private yDivisions: number;
    constructor(xDivisions: number, yDivisions: number) {
        this.xDivisions = xDivisions;
        this.yDivisions = yDivisions;
    }
    public getXDivisions() {
        return this.xDivisions;
    }
    public getYDivisions() {
        return this.yDivisions;
    }
}

export class GridPosition {

    private viewport: Viewport;
    private grid: Grid;

    private viewportX: number = 0;
    private viewportY: number = 0;

    private gridX: number;
    private gridY: number;

    public gridXRatio: number = 0;
    public gridYRatio: number = 0;

   

    constructor(grid: Grid, viewport: Viewport, gridX?: number, gridY?: number) {
        
        this.grid = grid;

        this.gridX = gridX ?? 0;
        this.gridY = gridY ?? 0;

        if (this.gridX >= grid.getXDivisions() || this.gridY >= this.grid.getYDivisions())
            throw new Error(`Attempted to initialize GridPosition with values (${this.gridX}, ${this.gridY}) in a Grid of dimensions (${this.grid.getXDivisions}, ${this.grid.getYDivisions})`);
        
        this.viewport = viewport;
        
        this.recalcuateViewportValues();
        
    }

    private recalcuateViewportValues() {
        this.gridXRatio = this.viewport.pixelsX / this.grid.getXDivisions();
        this.gridYRatio = this.viewport.pixelsY / this.grid.getYDivisions();

        this.viewportX = this.gridX * this.gridXRatio;
        this.viewportY = this.gridY * this.gridYRatio;
    }
    
    public getGridX() {
        return this.gridX;
    }

    public getGridY() {
        return this.gridY;
    }

    public setFromGridX(newVal: number) {
        if (newVal >= this.grid.getXDivisions())
            throw new Error(`Attempted to set GridPosition x as ${this.gridX} in a Grid of dimensions (${this.grid.getXDivisions}, ${this.grid.getYDivisions})`);
        this.gridX = newVal;
        this.viewportX = this.gridX * this.gridXRatio;
    }

    public setFromGridY(newVal: number) {
        if (newVal >= this.grid.getYDivisions())
            throw new Error(`Attempted to set GridPosition y as ${this.gridY} in a Grid of dimensions (${this.grid.getXDivisions}, ${this.grid.getYDivisions})`);
        this.gridY = newVal;
        this.viewportY = this.gridY * this.gridYRatio;
    }

    public setFromViewportX(newVal: number) {
        this.setFromGridX(Math.round(newVal / this.gridXRatio));
    }

    public setFromViewportY(newVal: number) {
        this.setFromGridY(Math.round(newVal / this.gridYRatio));
    }

    public setViewport(newVal: Viewport) {
        this.viewport = newVal;
        this.recalcuateViewportValues();
    }

    public setGrid(newVal: Grid) {
        this.grid = newVal;
        this.recalcuateViewportValues();
    }

}


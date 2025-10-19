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
    xDivisions: number;
    yDivisions: number;
    xUnits: number;
    yUnits: number;

    constructor(xDivisions: number, yDivisions: number, xUnits: number, yUnits: number) {
        this.xDivisions = xDivisions;
        this.yDivisions = yDivisions;
        this.xUnits = xUnits;
        this.yUnits = yUnits;
    }
}

export class GridPosition {

    private grid: Grid;

    private pixelX: number = 0;
    private pixelY: number = 0;

    private gridX: number;
    private gridY: number;

    public gridXRatio: number = 0;
    public gridYRatio: number = 0;

    constructor(grid: Grid, gridX?: number, gridY?: number) {
        
        this.grid = grid;

        this.gridX = gridX ?? 0;
        this.gridY = gridY ?? 0;

        if (this.gridX >= grid.xDivisions || this.gridY >= this.grid.yDivisions)
            throw new Error(`Attempted to initialize GridPosition with values (${this.gridX}, ${this.gridY}) in a Grid of dimensions (${this.grid.xDivisions}, ${this.grid.yDivisions})`);
        
        
        this.recalcuateValues();
        
    }

    private recalcuateValues() {
        this.gridXRatio = this.pixelX / this.grid.xDivisions;
        this.gridYRatio = this.pixelY / this.grid.yDivisions;

        this.pixelX = this.gridX * this.gridXRatio;
        this.pixelY = this.gridY * this.gridYRatio;
    }
    
    public getGridX() {
        return this.gridX;
    }

    public getGridY() {
        return this.gridY;
    }

    public setFromGridX(newVal: number) {
        if (newVal >= this.grid.yDivisions)
            throw new Error(`Attempted to set GridPosition x as ${this.gridX} in a Grid of dimensions (${this.grid.xDivisions}, ${this.grid.yDivisions})`);
        this.gridX = newVal;
        this.pixelX = this.gridX * this.gridXRatio;
    }

    public setFromGridY(newVal: number) {
        if (newVal >= this.grid.yDivisions)
            throw new Error(`Attempted to set GridPosition y as ${this.gridY} in a Grid of dimensions (${this.grid.xDivisions}, ${this.grid.yDivisions})`);
        this.gridY = newVal;
        this.pixelY = this.gridY * this.gridYRatio;
    }

    public setFromViewportX(newVal: number) {
        this.setFromGridX(Math.round(newVal / this.gridXRatio));
    }

    public setFromViewportY(newVal: number) {
        this.setFromGridY(Math.round(newVal / this.gridYRatio));
    }

    public setGrid(newVal: Grid) {
        this.grid = newVal;
        this.recalcuateValues();
    }

}


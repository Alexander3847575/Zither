<script lang="ts">
    import ChunkRoot from "$lib/components/ChunkRoot.svelte";
    import Dock from "$lib/components/Dock.svelte";
  import RadialMenu from "$lib/components/RadialMenu.svelte";
    import { setContext } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import { SvelteSet } from "svelte/reactivity";

    // Runtime export of application state enums
    export const AppStates = {
        Default: 'Default',
        InteractPane: 'InteractPane',
        InteractMenu: 'InteractMenu',
        MovingPane: 'MovingPane',
        MovingSpace: 'MovingSpace'
    } as const;

    let viewportPos: [number, number] = [0, 0];
    let chunkSize: [number, number] = [16, 8]; // In terms of units
    let unitToPixelRatio = new Tween(document.body.clientWidth / 16, {
        duration: 0,
        easing: cubicOut,
    });
    let chunkDimensions: [Tween<number>, Tween<number>] = [
        new Tween(chunkSize[0] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        }),
        new Tween(chunkSize[1] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        })
    ];
    let chunkAspectRatio = chunkSize[0] / chunkSize[1];
    let initialOffset = [screen.availWidth / 2 - chunkDimensions[0].current / 2, screen.availHeight / 2 - chunkDimensions[1].current / 2];
    let mousePos: [number, number] = [0, 0];
    let mouseDelta: [number, number] = [0, 0];
    let effectiveDelta: [number, number] = [0, 0];
        let globalOffset: [Tween<number>, Tween<number>] = [
        new Tween(initialOffset[0] + viewportPos[0] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        }),
        new Tween(initialOffset[1] + viewportPos[1] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        })
    ];

    let directionData = "";

    let appState: AppState = $state({
        state: AppStates.Default,
        viewportPos: viewportPos,
        unitToPixelRatio: unitToPixelRatio,
        chunkSize: chunkSize,
        chunkDimensions: chunkDimensions,
        globalOffset: globalOffset,
        mousePos: mousePos,
        mouseDelta: mouseDelta,
        effectiveDelta: effectiveDelta,
        directionData: directionData,
        activeChunk: "",
        selectedPanes: new SvelteSet<string>(),
        selectionMode: false as boolean,
        // Selection methods
        selectPane: function(uuid: string) {
            this.selectedPanes.add(uuid);
            this.selectionMode = true;
        },
        deselectPane: function(uuid: string) {
            this.selectedPanes.delete(uuid);
            if (this.selectedPanes.size === 0) {
                this.selectionMode = false;
            }
        },
        toggleSelection: function(uuid: string) {
            if (this.selectedPanes.has(uuid)) {
                this.deselectPane(uuid);
            } else {
                this.selectPane(uuid);
            }
        },
        clearSelection: function() {
            this.selectedPanes.clear();
            this.selectionMode = false;
        },
        isSelected: function(uuid: string): boolean {
            return this.selectedPanes.has(uuid);
        },
        getSelectedPanes: function(): string[] {
            return Array.from(this.selectedPanes);
        },
        getSelectionCount: function(): number {
            return this.selectedPanes.size;
        }
    });

    setContext("appstate", appState);    


    //await chunkManager.testRender(7);

    // Listeners
    let clickTimer: NodeJS.Timeout;
    const doubleClickInterval = 100;
    let doubleClickEligible = false;

    let body = document.body;

    body?.addEventListener("mousedown", (event) => {

    // Double click handler
    if (doubleClickEligible) {
        //console.log("Double click detected!");
        switch (event.button) {
            case 0:
                appState.state = AppStates.MovingPane;
                break;
            case 2:
                //console.log("Open context menu")
                appState.state = AppStates.InteractMenu;
                break;
        }
        return;
    }

    // Click-away deselection (only for left-click)
    if (event.button === 0) {
        const target = event.target as Element;
        const clickedPane = target?.closest('[class*="pane-"]');
        if (!clickedPane && appState.selectedPanes.size > 0) {
            appState.clearSelection();
        }
    }

    // Single click handler
    //console.log("Mouse down detected!");
    switch (event.button) {
    case 0:
        //console.log("Interact with Pane")
        appState.state = AppStates.InteractPane;
        //updateUnitToPixelRatio(appState.unitToPixelRatio.current * 1.1);
        break;
    case 1:
        // Middle button
        break;
    case 2:
        //console.log('Dragging space')
        appState.state = AppStates.MovingSpace;
        //updateUnitToPixelRatio(appState.unitToPixelRatio.current * 0.9);
        break;
    }

    });

    body?.addEventListener("mouseup", (event) => {
        //console.log("Mouse up detected!");
        if (!doubleClickEligible) {

            doubleClickEligible = true;
            clickTimer = setTimeout(() => {
                doubleClickEligible = false;
            }, doubleClickInterval); // Delay to check for double-click

        } else {

            doubleClickEligible = false;
        }

        snapViewportValue();
        appState.state = AppStates.Default;

    });

    body.addEventListener("mouseleave", event => {
        doubleClickEligible = false;
        snapViewportValue();
        appState.state = AppStates.Default;
    });

    body?.addEventListener("mousemove", (event) => {
        appState.mousePos[0] = event.clientX;
        appState.mousePos[1] = event.clientY;
        if ((appState.state == AppStates.Default) || (appState.state == AppStates.InteractPane))
            return;
        appState.mouseDelta[0] += event.movementX;
        appState.mouseDelta[1] += event.movementY;
        appState.effectiveDelta = calculateEffectiveDelta(appState.mouseDelta, appState.chunkDimensions[0].current, [1, chunkAspectRatio]);
        if (appState.state == AppStates.MovingSpace) {
            updateGlobalOffset(appState.globalOffset, appState.effectiveDelta);
        }
    });
    body?.addEventListener("resize", event => {
        console.log("resize");
    });

    function snapViewportValue() {
        let snapTolerance = 4
        if (appState.state == AppStates.MovingSpace) {
            let newViewportPos = appState.viewportPos;
            if (Math.abs(appState.mouseDelta[0]) >= chunkDimensions[0].current / snapTolerance){
                newViewportPos[0] += 1 * Math.sign(appState.mouseDelta[0]) * -1;
            }
            if (Math.abs(appState.mouseDelta[1]) >= chunkDimensions[1].current / snapTolerance) {
                newViewportPos[1] += 1 * Math.sign(appState.mouseDelta[1]);
            }
            appState.viewportPos = newViewportPos;
            appState.mouseDelta = [0, 0];
            appState.effectiveDelta = [0, 0];
            updateGlobalOffset(appState.globalOffset);
        }
    }

    const Direction = {
        up: "up",
        leftUp: "leftUp",
        left: "left",
        leftDown: "leftDown",
        down: "down",
        rightDown: "rightDown",
        right: "right",
        rightUp: "rightUp"
    }

    function calculateEffectiveDelta(currentDelta: [number, number], halfDist: number, scale: [number, number] = [1, 1]): [number, number] {
        
        let a: [number, number] = calculateResistance(currentDelta, halfDist, scale);
        let b: [number, number] = [0, 0];
        let direction = calculateDirection(a);
        
        // Normalize to 8 directions
        switch (direction) {
            case Direction.up:
            case Direction.down:
                b = [0, currentDelta[1]];
                break;
            case Direction.left:
            case Direction.right:
                b = [currentDelta[0], 0];
                break;
            default:
                let xDir = 1;
                let yDir = 1;
                switch (direction){
                    case Direction.rightUp:
                        yDir = -1;
                        break;
                    case Direction.leftDown:
                        xDir = -1;
                        break
                    case Direction.leftUp:
                        yDir = -1;
                        xDir = -1;
                        break;
                }
                let greaterVal = (currentDelta[0] > currentDelta[1]) ? Math.abs(currentDelta[0]) : Math.abs(currentDelta[1]);
                b = [greaterVal * xDir, greaterVal * yDir];
                break;
        }

        appState.directionData = direction; //+ " " + a + " " + b;


        // Project vector bc faster than mutliplying unit vector by magnitude bc of square root
        // Dot product of a and b
        let dotProduct = a[0] * b[0] + a[1] * b[1];
        // Magnitude squared of vector b
        let magnitudeB2 = b[0] * b[0] + b[1] * b[1];
        // Scalar multiplier for projection
        let scalar = dotProduct / magnitudeB2;
        // Projected vector
        return [Math.round(scalar * b[0]), Math.round(scalar * b[1])];
    }

    function calculateResistance(vec: [number, number], halfDist: number, scale: [number, number] = [1, 1]): [number, number] {
        // Calc cubic resistance
        let x = vec[0] * scale[0];
        let y = vec[1] * scale[1];
        let dist = Math.sqrt(x*x + y*y);
        let ratio = dist / halfDist;
        let factor = 1 / (ratio + 1);
        return [vec[0] * factor, vec[1] * factor];
    }

    function calculateDirection(vec: [number, number]): string {
        let x = vec[0];
        let y = vec[1];
        let absX = Math.abs(x);
        let absY = Math.abs(y);

        if (absX > absY) {
            // vertical side
            let half = absX * 0.4142;
            if (x < 0) {
                // left side
                if (y > half) {return Direction.leftDown;}
                if (y < -half) {return Direction.leftUp;}
                return Direction.left;
            } else {
                // right side
                if (y > half) {return Direction.rightDown;}
                if (y < -half) {return Direction.rightUp;}
                return Direction.right;
            }
        } else {
            // horizontal side
            let half = absY * 0.4142;
            if (y > 0) {
                // bottom
                if (x > half) {return Direction.rightDown;}
                if (x < -half) {return Direction.leftDown;}
                return Direction.down;
            } else {
                // top
                if (x > half) {return Direction.rightUp;}
                if (x < -half) {return Direction.leftUp;}
                return Direction.up;
            }
        }
    }

    function updateGlobalOffset(globalOffset: [Tween<number>, Tween<number>], additionalOffset: [number, number] = [0,0], instant: boolean = false): [number, number] {
        var updatedVals: [number, number] = [
            initialOffset[0] - appState.viewportPos[0] * appState.chunkDimensions[0].target + additionalOffset[0],
            initialOffset[1] + appState.viewportPos[1] * appState.chunkDimensions[1].target + additionalOffset[1]
        ];

        if (instant) {
            globalOffset[0].set(updatedVals[0], {duration: 0});
            globalOffset[1].set(updatedVals[1], {duration: 0});
        } else {
            globalOffset[0].set(updatedVals[0]);
            globalOffset[1].set(updatedVals[1]);
        }

        return updatedVals;
    }

    function updateUnitToPixelRatio(newRatio: number) {
        appState.unitToPixelRatio.set(newRatio);
        let newX = appState.chunkSize[0] * newRatio;
        let newY = appState.chunkSize[1] * newRatio;
        appState.chunkDimensions[0].set(newX);
        appState.chunkDimensions[1].set(newY);
        initialOffset = [screen.availWidth / 2 - newX / 2, screen.availHeight / 2 - newY / 2];
        updateGlobalOffset(appState.globalOffset, [0, 0], false);
    }

</script>

<ChunkRoot></ChunkRoot>
<Dock></Dock>
{#if appState.state == "InteractMenu"}
    <RadialMenu></RadialMenu>
{/if}
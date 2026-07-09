/**
 * Career Quest
 * Animation Engine v0.8
 * ---------------------------------
 * Controla todas las animaciones del mundo.
 */

class AnimationEngine {
    constructor() {
        this.systems = [];
        this.lastTime = performance.now();
        this.running = false;
    }
    register(system){
        if(system && typeof system.update === "function"){
            this.systems.push(system);
        }
    }
    start(){
        if(this.running) return;
        this.running = true;
        requestAnimationFrame(this.loop.bind(this));
    }
    loop(time){
        const delta=(time-this.lastTime)/1000;
        this.lastTime=time;
        this.systems.forEach(system=>{
            if(system.update){
                system.update(delta);
            }
        });
        requestAnimationFrame(this.loop.bind(this));
    }
}
window.AnimationEngine=new AnimationEngine();
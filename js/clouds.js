/**
 * Sistema de Nubes
 */
class Clouds {
    constructor(){
        this.clouds=[];
        this.container=document.createElement("div");
        this.container.id="cloud-layer";
        document.body.appendChild(this.container);
        this.createClouds();
    }
    createClouds(){
        for(let i=0;i<10;i++){
            const cloud=document.createElement("div");
            cloud.className="cloud";
            cloud.style.top=(Math.random()*25)+"%";
            cloud.style.left=(Math.random()*100)+"%";
            cloud.style.animationDuration=(40+Math.random()*50)+"s";
            cloud.style.animationDelay=(-Math.random()*40)+"s";
            this.container.appendChild(cloud);
            this.clouds.push(cloud);
        }
    }
    update(){}
}
window.CloudSystem=new Clouds();
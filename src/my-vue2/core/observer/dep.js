
let uid = 0

export default class Dep {

    subs;

    constructor(){
        this.id = uid++
        this.subs = [];
    }

    depend(info){
        // 
        if(Dep.target){
            Dep.target.addDep(this);
        }
    }
}

Dep.target = null;
const targetStack = [];

export function pushTarget(target){
    targetStack.push(target);
    Dep.target = target;
}

export function popTarget(){
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
}
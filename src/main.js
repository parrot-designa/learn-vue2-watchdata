
// import { createElement } from "./my-vue2/core/vdom/create-element";
// import { createTextVNode } from "./my-vue2/core/vdom/vnode";
// import { compileToFunctions } from "./my-vue2/platforms/web/compiler/index";

import Vue from "@/my-vue2/platforms/web/entry-runtime-with-compiler-esm";
// import Vue from "vue/dist/vue.esm.browser";

// let div1 = createElement('div',{attr:{id:'app'}},"Hello World");

// let div2 = createTextVNode("Hello World2");  

// const { render } = compileToFunctions(`<div><span>我是爱吃水果的人</span></div>`)

// const vm = Vue();

// Vue.config.optionMergeStrategies.test1 = (parent,child)=>{
//     console.log("第一个参数："+parent);
//     console.log("第二个参数："+child);
//     return '我是自定义策略'
// } 

// console.log(vm.$options.test1);
import Test from "./Test.vue"

// const vm = new Vue(Test).$mount("#app"); 

const vm = new Vue({ 
    template:`<div>{{ msg }}</div>`,
    data:{
        msg:'Hello World'
    }
}).$mount("#app"); 

 
    
 
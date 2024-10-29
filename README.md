🔥从零手写vue2 - 数据初始化设置以及数据监听

# 一、编译器部分增加 data 解析

前面几节我们实现了从模板编译到渲染页面，基本上展示Vue的基本功能。

但是 Vue强大之处在于数据的使用和监听。

```js
const vm = new Vue({ 
    template:`<div>{{ msg }}</div>`,
    data:{
        msg:'Hello World'
    }
}).$mount("#app"); 
```

如下，我们将上节中写死在模版中的文字放置在 data 的位置。

![alt text](image.png)

发现并不能获得我们想要的结果。

他将插值表达式直接当成了文字部分。

因为在模板编译时我们并没有考虑到插值表达式的特殊处理。

在模版编译时，我们直接将文字放在 text中。

```js
chars:(text)=>{
    if(text){
        let res,child;
        // 看看是否能解析到插值表达式
        if(res = parseText(text)){
            child = {
                type: 2,
                expression: res.expression,
                text
            }
        }else{
            child = {
                type:3,
                text
            }
        }
        // 获取栈顶元素 即当前处理中的元素 为文字节点的父元素
        let currentParent = stack[stack.length-1];
        currentParent.children = currentParent.children || [];
        currentParent.children.push(child)
    } 
},

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

export function parseText(text){
    const tagRE = defaultTagRE;
    if (!tagRE.test(text)) {
        return
    }
    let tokens = [];
    // RegExp对象有一个数学叫做 lastIndex,用来记录正则表达式上一次匹配的位置。
    // 这个属性主要用于全局搜索（当使用g标志时），它保存了最后一次匹配结束的位置的索引+1  
    // 使用 test匹配过一次 需要重置 lastIndex 否则无法生效
    tagRE.lastIndex = 0;
    // 匹配模板引擎的占位符
    let match 
    while ((match = tagRE.exec(text))) {
        // 这里的 exp 匹配到的是 {{ }} 中的内容
        const exp = match[1].trim();
        tokens.push(`_s(${exp})`) 
    }
   
    return {
        expression: tokens.join('+')
    }
}
```

在模板解析为 ast的阶段，parseText函数用于解析插值表达式，并且将内容使用`_s()`进行包裹。

`{{ msg }}` 将被转化成 `{type:2,expression:"_s(msg)",text:"{{ msg }}"}`

> 模版编译时我们曾说过：type为 1 代表节点、type为 2 代表有插值表达式的文字、type为 3 代表纯文本。

然后在 ast 转成 render 函数阶段时修改 genText 函数。

如果 type为 2 代表是有插值表达式的文字，直接使用 expression字段。

```js
export function genText(text) {
    return `_v(${
        text.type === 2 
        ? text.expression
        : JSON.stringify(text.text)
    })`
}
```

所以可以知道在vue模板把插值表达式转成了`_s`。

_s和_v一样，是在`installRenderHelpers`中定义的。

```js

/**
 * 转化成 string
 */
export function toString(val) {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
    ? JSON.stringify(val, replacer, 2)
    : String(val)
}


function replacer(_key, val) { 
  if (val && val.__v_isRef) {
    return val.value
  }
  return val
}

function installRenderHelpers(target){
    target._s = toString
}
``` 
可以看到会提示 msg 没有定义。

with中的变量会现在绑定的对象上进行查找，如果无法查找就查看本地作用于上是否存在，否则就会报错。

所以现在的问题是 vue实例上没有 msg 属性，那么明明我们已经定义了 data，为啥没有用呢？

因为我们还没有补充这方面相关的逻辑。


# 二、initState 初始化

在构造函数初始化的时候，会调用 initState 进行 data的初始化。

```js
Vue.prototype._init = function(){
    const vm = this;
    // initState调用 进行 data的初始化
    initState(vm)
}

// 这里进行初始化 state、props、computed等 暂时只说data
export function initState(vm) {
    const opts = vm.$options;
    if (opts.data) {
        initData(vm)
    }
}
```

# 三、initData

我们知道data既可以定义成一个对象，也可以定义成一个函数。

如果是一个函数，传入实例直接执行，如果是一个对象，则直接赋值给 `vm._data`。

```js
// 执行 data函数
export function getData(data, vm){
    try{
        return data.call(vm,vm);
    }catch(e){
        return {}
    }
}

function initData(vm){
    let data = vm.$options.data;
    data = vm._data = isFunction(data) ? getData(data, vm) : data || {}
    if(!isPlainObject(data)){
        data = {};
        __DEV__ && 
            warn(
                "data方法应该返回一个对象"
            )
    }
    // 在实例上代理 data
    // 获取 data上所有的 key
    const keys = Object.keys(data);
    let i = keys.length;
    while(i--){
        const key = keys[i];
        // 不以_或者$开头
        if(!isReserved(key)){
            proxy(vm, `_data`, key)
        }
    }
}
```

# 四、对vm.key做代理

如下，对 `vm.key` 做代理。

访问 vm.key 相当于直接获取 vm._data的值。

同理，设置 vm.key 相当于设置 vm._data。 

```js
const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
}

export function proxy(target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
      return this[sourceKey][key]
    }
    sharedPropertyDefinition.set = function proxySetter(val) {
      this[sourceKey][key] = val
    }
    Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

此时页面已经成功渲染出来了 msg变量的内容。

# 五、编译器部分增加事件解析

等一下我们会演示数据可变的功能。

所以我们需要通过事件进行触发。

由于我们没有添加事件相关的逻辑，所以我们需要进行添加。

得益于 vue强大的模版编译，你可以将事件定义在模板中，或者定义在方法中。

之前我们解析动态属性`(@/v-on)`时，使用正则表达式进行匹配，但是我们将解析过后的属性直接返回，match正则匹配对象是一个数组，会非常的难看。所以我们可以进行适当的调整。

参照源码我们使用一个函数来处理属性。

```js
    function handleStartTag(match){
        const tagName = match.tagName;
        const l = match.attrs.length;
        const attrs = new Array(l)
        for(let i = 0; i < l; i++){
            const args = match.attrs[i];
            // args[0] 是匹配到的属性字符串 @click="msg = '你好世界'"
            // args[1] 是属性名 ，包括前面的修饰符以及方括号内的内容和属性名本身 @click
            // args[2] 如果存在等号= 则会被捕获 但这通常是一个布尔值，表示是否有等号 =
            // args[3] 如果属性值被双引号包围，则这部分内容将被捕获 msg = '你好世界'
            // args[4] undefined
            // args[5] undefined
            const value = args[3] || args[4] || args[5] || ""; 
            attrs[i] = {
                name:args[1],
                value
            }
        }
        if (options.start) {
            options.start({tagName, attrs})
        }
    }
```

处理为一个以属性名为 key，属性值为属性内容的对象。

# 六、补充创建 AST时 事件相关的属性

对于类似事件、指令等，ast上有特别的属性，比如如果一个节点上存在事件。

则会在这个节点的 ast上新增一个hasBindings属性和一个 events属性。

对于这部分逻辑，在 vue中是在关闭节点时触发的。

```js
end:()=>{
    // 关闭元素时调用
    closeElement(element)
}

function closeElement(element){
    processElement(element);
}

export function processElement(element){
    processAttrs(element)
}

// 处理属性
function processAttrs(el){
    const list = el.attrsList
    let i, name,value, l;
    for (i = 0, l = list.length; i < l; i++) {
        name = list[i].name;
        value = list[i].value
        // 如果匹配到 v-on、@、v-bind、:
        if(dirRE.test(name)){
            // 说明绑定了一些动态属性
            el.hasBindings = true;
            // 如果是事件
            if(onRE.test(name)){
                // 删除事件相关的修饰符 只剩下名字
                name = name.replace(onRE, '');
                addHandler(el, name, value);
            }
        }
    }
}
```

判断如果属性中存在绑定动态属性，如`@、v-on、:、v-bind`，则设置一个 `hasBindings`属性。

然后绑定一个`events`属性。

# 7、生成render函数时，在模版中增加对应属性

事件都存放在 data属性中：

```js
export function genData(el){
    let data = "{"

    if (el.events) {
        // genHandlers 生成的内容为 {on:{click:function($event){msg = '你好世界'}}} 
        data += `${genHandlers(el.events, false)},`
    }
    // 去除最后的逗号并拼接 }
    data = data.replace(/,$/, '') + '}'
    return data;
}

export function genHandlers(
    events
){
    const prefix = 'on:';
    let staticHandlers = ``
    for(const name in events){
        const handlerCode = genHandler(events[name]);
        staticHandlers += `"${name}":${handlerCode},`
    }
    // 加上括号+去除逗号
    staticHandlers = `{${staticHandlers.slice(0, -1)}}`
    return prefix + staticHandlers;
}

function genHandler(
    handler
){
    if(!handler){
        return 'function(){}'
    } 
    const handlerCode = handler.value;
    return `function($event){${handlerCode}}`
}
```




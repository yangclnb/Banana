//框架基类
class Banana {
    constructor(element) {
        this.el = this.getRootElement(element.el);

        window.__dataList = element.data;

        this.data = element.data;
        this.originalEl = this.el.cloneNode(true);
        this.methods = element.methods;

        //添加数据劫持
        new HijackingData(this.data);

        //数据代理
        this.proxyData(this.data);

        //收集methods
        let handleMethods = new HandleMethods(this.methods, this.data);

        //需要调用Banana中的this，需要把本身也传入编译器中

        //编译DOM
        new Compile(this, this.el, this.data, handleMethods);

        // this.data.personalInfo.age = "123";

        // console.log(this.el, this.data);
    }

    //确保el始终为element
    getRootElement(element) {
        if (typeof element == "string") {
            return document.querySelector(element);
        } else if (element.nodeType == 1) {
            return element;
        }
    }

    //数据代理  yang.data.name = yang.name
    proxyData(data) {
        for (let item in data) {
            Object.defineProperty(this, item, {
                get() {
                    return data[item];
                }
            })
        }
    }

}


//数据劫持
class HijackingData {
    constructor(data) {
        this.hijackingData(data);
    }

    hijackingData(data) {
        for (let key in data) {
            // console.log('key :>> ', key, data[key]);
            if (typeof data[key] == 'object') {
                this.hijackingData(data[key]);
            }
            this.addGettingSetting(data, key, data[key]);
        }
    }

    addGettingSetting(object, key, value) {
        let dep = new Dep();
        Object.defineProperty(object, key, {
            get() {

                Dep.target && dep.addWatcher(Dep.target);

                // console.log('读取 :>> ', value);
                return value;
            },
            set: (newValue) => {
                // console.log('dep :>> ', dep);
                // console.log('设置 :>> ', newValue);
                if (value != newValue) {
                    value = newValue;

                    // console.log('value,newVal :>> ', value + " , " + newValue);

                    //更新观察者
                    dep.notify();

                    //新数据依然需要加入数据劫持
                    this.hijackingData(this);
                    return value;

                }
            }
        })
    }
}


//观察者

class Dep {
    constructor() {
        this.watchList = [];
    }
    addWatcher(watcher) {
        let isOnly = true;
        for (let item of this.watchList) {
            if (item == watcher) {
                isOnly = false;
            }
        }

        if (isOnly)
            this.watchList.push(watcher);
    }
    notify() {
        this.watchList.forEach((watcher) => {
            watcher.update();
        })
    }
}

class Watcher {
    constructor(data, expr, cb) {
        //cb 传入的回调函数

        this.data = data;
        this.expr = expr;
        this.cb = cb;
        this.oldVal = this.getVal();
    }
    //获取数据
    getVal() {
        Dep.target = this;
        let result = Compiler.getCurrentVal(this.data, this.expr);
        Dep.target = null;
        return result;
    }
    //数据更新
    update() {
        //再次获取当前值 对比是否变化
        let newVal = this.getVal();

        if (newVal !== this.oldVal) {
            this.cb(this.oldVal, newVal);
        }
    }
}




//编译DOM
class Compile {
    constructor(BananaBasic, el, data, handleMethods) {
        this.element = el;
        this.data = data;
        this.handleMethods = handleMethods;

        let fragment = document.createDocumentFragment();

        //提取DOM 
        this.extractDOM(fragment, this.element);
        //编译输出DOM
        this.compileDOM(fragment, this.element, this.data);



        // data.personalInfo.name = "aaaa";
    }

    refreshDOM(originalEl, data) {
        //更新内部data
        this.data = data;
        //清空页面数据
        this.element.innerText = "";
        let fragment = document.createDocumentFragment();
        this.extractDOM(fragment, originalEl);
        this.compileDOM(fragment, this.element, this.data);
    }

    //获取数据
    getCurrentVal(data, name) {

        //取对象
        let nameList = name.split('.');
        let result = data;
        for (let i = 0; i < nameList.length; i++) {
            // console.log('result :>> ', result, result[nameList[i]]);

            if (result[nameList[i]] != undefined) {
                result = result[nameList[i]];
            } else {
                // console.log('nameList :>> ', nameList);
                let arrayIndex = name.match(/\[[0-9]\]/);

                //防止出现 Object.Name[Key]的情况
                let arrayName = name.slice(0, -3);
                arrayName = arrayName.split(".");
                arrayName = arrayName[arrayName.length - 1];

                // console.log('list.slice(1,2) :>> ', arrayIndex[0].slice(1,2));
                arrayIndex = arrayIndex[0].slice(1, 2);
                // console.log('name.slice(0,-3) :>> ', arrayName);
                // console.log('arrayName[arrayIndex] :>> ', arrayName +"["+arrayIndex+"]");
                result = result[arrayName][arrayIndex];
                // console.log(result);
            }
        }
        // console.log(name, result);
        return result;

    }

    //遍历DOM提取到内存中
    extractDOM(fragment, element) {
        let child;
        while (child = element.firstChild) {
            fragment.append(child);
        }
        // console.log('存入fragment :>> ', fragment);
    }

    compileDOM(fragment, element, data) {

        let nextchild;
        // console.log('child :>> ', nextchild.nextSibling);
        while (nextchild = fragment.firstChild) {

            if (this.isElementNode(nextchild)) {
                //元素节点可能存在需要替换得元素以及内容
                //替换属性
                this.methodsDOM.replaceAttr(nextchild, data);

                //元素可能存在子节点，需要遍历
                if (nextchild.firstElementChild != null) {
                    let childFragment = document.createDocumentFragment();
                    this.extractDOM(childFragment, nextchild);
                    this.compileDOM(childFragment, nextchild, data);
                }
            }
            //文本节点只能存在替换内容
            //替换插值
            this.methodsDOM.replaceContent(nextchild, data);

            element.append(nextchild);
        }

    }

    isElementNode(node) {
        return node.nodeType == 1;
    }

    isMethods(methodName) {
        return methodName.slice(-2) == "()";
    }

    methodsDOM = {
        //替换属性
        replaceAttr(node, data) {
            let attributes = node.attributes;
            [...attributes].forEach((attr) => {
                let name = attr.name,
                    value = attr.value;
                if (name.startsWith("b-")) {
                    // console.log(typeof name);
                    let method = name.split('-')[1].split(":")[0]; // 例如 b-bind:class 噶掉 b- & :class 取 bind 
                    // console.log('method :>> ', method);
                    //编译属性
                    this.methodsBind[method](node, name, value, data);
                }
            });
        },

        //替换插值
        replaceContent: (node, data) => {
            let contentOrigin = node.textContent;
            let content = contentOrigin;
            let matchList = content.match(/\[\_(.+?)\_\]/g);

            // console.log(matchList);
            for (let item in matchList) {
                let handleName = matchList[item].slice(2, -2).trim();
                let getVal = this.getCurrentVal(data, handleName);
                let originalContent = node.innerHTML;
                content = originalContent.replaceAll(matchList[item], getVal);

                //添加guan'cha'zhe
                new Watcher(this.data, handleName, (oldVal, newValue) => {

                    Compiler.replaceAgain(node, data, contentOrigin);

                    // let replaceList = contentOrigin.match(/\[\_(.+?)\_\]/g);
                    // let originNodeEl = contentOrigin;
                    // for (let i in replaceList) {

                    //     // originalContent = contentOrigin;
                    //     // content = originalContent.replaceAll(matchList[item], newValue);
                    //     // node.textContent = content;
                    //     handleName = replaceList[i].slice(2, -2).trim();
                    //     getVal = this.getCurrentVal(data, handleName);
                    //     content = originNodeEl.replaceAll(replaceList[i], getVal);

                    //     console.log('replaceList[i] :>> ', replaceList[i], i);
                    //     console.log('getVal , handleName :>> ', getVal, handleName);
                    //     console.log('content :>> ', content);
                    // }
                    // node.textContent = content;
                });

                // console.log(item,getVal,content);
                node.textContent = content;
            }
        },
        methodsBind: {
            //b-model
            model: (node, attrName, attrVal, data) => {
                // node.setAttribute(attrName, this.getCurrentVal(data, attrVal));
                node.value = this.getCurrentVal(data, attrVal);

                new Watcher(this.data, attrVal, (oldVal, newValue) => {
                    // console.log('b-modle newValue :>> ', oldVal, newValue);
                    node.value = this.getCurrentVal(data, attrVal);
                })

                node.addEventListener("input", (e) => {
                    let value = e.target.value;
                    Compiler.setCurrentVal(data, attrVal, value);
                })
            },
            //b-bind
            bind: (node, attrName, attrVal, data) => {
                // console.log('this.eventHandle.canHandleList[0] :>> ', this.eventHandle.canHandleList);

                let RealAttrName = attrName.split(":")[1];

                //绑定方法
                for (let item of this.handleMethods.canHandleList) {
                    if (item == RealAttrName) {
                        //RealAttrName 如 click / update
                        this.handleMethods.bindMethods[RealAttrName](node, attrVal);

                        // console.log('this.handleMethods :>> ', this.handleMethods.getMethods);
                    }
                }

                //传入的属性值可能是方法,方法已经在上面的for中绑定了
                if (!this.isMethods(attrVal)) {
                    node.attributes.removeNamedItem(attrName);
                    node.setAttribute(RealAttrName, this.getCurrentVal(data, attrVal));
                }
            }
        }
    }
}

//处理methods对象中的方法
class HandleMethods {
    //允许绑定的列表
    canHandleList = ["click", "update"]
    constructor(methods, data) {
        //在对象中添加data
        // methods["data"] = data;

        this.methods = methods;
        this.data = data;

        // console.log('this.methods :>> ', this.methods);
    }

    getMethod(methodName) {
        // this.methods[methodName]();
        return this.methods[methodName];
    }

    //绑定处理方法
    bindMethods = {
        click: (node, methodName) => {
            console.log('methodName :>> ', methodName.slice(0, -2));

            // this.getMethod(methodName.slice(0, -2)).call(this.data);

            node.addEventListener("click", () => {
                this.getMethod(methodName.slice(0, -2)).call(this.data);
            });
        },
        update() {
            alert();
        }
    }

}


let Compiler = {
    //获取数据
    getCurrentVal(data, name) {
        //取对象
        let nameList = name.split('.');
        let result = data;
        for (let i = 0; i < nameList.length; i++) {
            // console.log('result :>> ', result, result[nameList[i]]);

            if (result[nameList[i]] != undefined) {
                result = result[nameList[i]];
            } else {
                // console.log('nameList :>> ', nameList);
                let arrayIndex = name.match(/\[[0-9]\]/);

                //防止出现 Object.Name[Key]的情况
                let arrayName = name.slice(0, -3);
                arrayName = arrayName.split(".");
                arrayName = arrayName[arrayName.length - 1];

                // console.log('list.slice(1,2) :>> ', arrayIndex[0].slice(1,2));
                arrayIndex = arrayIndex[0].slice(1, 2);
                // console.log('name.slice(0,-3) :>> ', arrayName);
                // console.log('arrayName[arrayIndex] :>> ', arrayName +"["+arrayIndex+"]");
                result = result[arrayName][arrayIndex];
                console.log(result);
            }
        }
        // console.log(name, result);
        return result;
    },
    setCurrentVal(vm, expr, value) {
        expr.split(".").reduce((data, current, index, arr) => {
            if (index == arr.length - 1) {
                return data[current] = value;
            }
            return data[current];
        }, vm);
    }, 
    //替换插值
    replaceAgain: (node, data, Origin) => {
        let matchList = Origin.match(/\[\_(.+?)\_\]/g);
        node.textContent = Origin;

        // console.log(matchList);
        for (let item in matchList) {
            let handleName = matchList[item].slice(2, -2).trim();
            let getVal = Compiler.getCurrentVal(data, handleName);
            let originalContent = node.innerHTML;
            content = originalContent.replaceAll(matchList[item], getVal);

            // console.log('replaceList[i] :>> ', matchList[item], item);
            // console.log('getVal , handleName :>> ', getVal, handleName);
            // console.log('content :>> ', content);

            // console.log(item,getVal,content);
            node.textContent = content;
        }
    }
}
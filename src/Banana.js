//框架基类
class Banana {
    constructor(element) {
        this.el = this.getRootElement(element.el);
        this.data = element.data;
        this.originalEl = this.el.cloneNode(true);
        this.hijackingData(this.data);

        //编译元素
        this.compile = new Compile(this.el, this.data);


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

    //数据劫持
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
        Object.defineProperty(object, key, {
            get() {
                console.log('读取 :>> ', value);
                return value;
            },
            set: (newValue) => {
                if (value != newValue) {
                    console.log('设置 :>> ', newValue);

                    this.value = newValue;
                    //新数据依然需要加入数据劫持
                    this.addGettingSetting(object, key, newValue);

                    this.el = this.originalEl.cloneNode(true);
                    //刷新DOM
                    this.compile.refreshDOM(this.el, this.data);
                    console.log(this.data);

                    return this.value;
                }
            }
        })
    }
}


//编译DOM
class Compile {
    constructor(el, data) {
        this.element = el;
        this.data = data;

        let fragment = document.createDocumentFragment();

        //提取DOM
        this.extractDOM(fragment, this.element);
        //编译输出DOM
        this.compileDOM(fragment, this.element, this.data);
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
                let arrayName = name.slice(0,-3);
                arrayName = arrayName.split(".");
                arrayName = arrayName[arrayName.length-1];

                // console.log('list.slice(1,2) :>> ', arrayIndex[0].slice(1,2));
                arrayIndex = arrayIndex[0].slice(1,2);
                // console.log('name.slice(0,-3) :>> ', arrayName);
                // console.log('arrayName[arrayIndex] :>> ', arrayName +"["+arrayIndex+"]");
                result = result[arrayName][arrayIndex];
                console.log(result);
            }
        }
        // console.log(name, result);
        return result;

    }

    //遍历DOM提取到内存中 (暂不处理子节点)
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
            let content = node.textContent;
            let matchList = content.match(/\[\_(.+?)\_\]/g);

            // console.log(matchList);
            for (let item in matchList) {
                let handleName = matchList[item].slice(2, -2).trim();
                let getVal = this.getCurrentVal(data, handleName);
                let originalContent = node.innerHTML;
                content = originalContent.replaceAll(matchList[item], getVal);
                // console.log(item,getVal,content);
                node.innerHTML = content;
            }
        },
        methodsBind: {
            //b-model
            model: (node, attrName, attrVal, data) => {
                // node.setAttribute(attrName, this.getCurrentVal(data, attrVal));
                node.value = this.getCurrentVal(data, attrVal);
            },
            //b-bind
            bind: (node, attrName, attrVal, data) => {
                let RealAttrName = attrName.split(":")[1];
                node.attributes.removeNamedItem(attrName);
                node.setAttribute(RealAttrName, this.getCurrentVal(data, attrVal));
            }
        }
    }
}
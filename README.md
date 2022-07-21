# Banana
--- 
### A simple MVVM framework
### 一个简单的MVVM框架

### Realize functions
1. Data bidirectional binding B-Model
2. Data and attribute binding b-bind
3. Interpolation input [_ value _]

### 实现功能
1. 数据双向绑定         b-model
2. 数据与属性绑定       b-bind
3. 插值输入             [_ value _]


### How to use?
### 如何使用?

``` javascript
 let yang = new Banana({
            el: "#app",
            data: {
                personalInfo: {
                    name: "杨晨龙",
                    age: 20,
                    testArray: ["test"],
                    testDeep: {
                        testArray: ["test222"]
                    }
                },
                userList: ["BananaBoat", "BananaReform"],
                text: "test",
                className: "banana"
            },
            methods: {
                changeName() {
                    // console.log('from:changeName this.personalInfo :>> ', this.personalInfo);
                    this.personalInfo.name = "test";
                },
                addUserAge() {
                    this.personalInfo.age++;
                },
                test() {
                    alert();
                }
            }
        });
```
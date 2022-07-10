# Banana
A simple MVVM framework

So far, only two-way binding has been implemented


How to use?
··· JavaScript
let yang = new Banana({
            el: "#app",
            data: {
                personalInfo: {
                    name: "香蕉皮恶霸",
                    age: 20,
                    testArray:["test"],
                    testDeep:{
                        testArray:["test222"]
                    }
                },
                userList:["BananaBoat","BananaReform"],
                text: "test",
                className:"banana"
            }
        });
···

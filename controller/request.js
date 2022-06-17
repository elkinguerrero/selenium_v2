const express = require('express');
const router = express.Router();
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
var array_driver = [];

router.post('/test', async (req, res) => {
    const config = {
        //Intentos de buscar un elemento que no existe
        int_search_element:3,
        //Intervalo de tiempo de busqueda de un objeto en milisegundos
        time_default_interval:0,
        //Tiempo de espera del selenium para busqueda de un elemento en milisegundos
        time_selenium_interval:100
    };
    let num_driver;
    let result_final = [];
    let intent_petition, end_process;
    
    const service = new chrome.ServiceBuilder('chromedriver/chromedriver');
    // Se valida que el driver no este ocupado
    for( let i=0; i<array_driver.length; i++)
        if( !array_driver[i].status ){
            num_driver = i;
            array_driver[num_driver].status = true;
            i=array_driver.length;
        }

    if( num_driver == undefined ){
        num_driver = array_driver.length;
    }

    array_driver.push({ "status":true, "driver": new Builder().forBrowser('chrome').setChromeService(service).build() });

    const webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

    let arr_query = [];
    let s_clase = [];

    // vars
    //   class = contiene la clase a buscar ejemplo: ".mi_clase"
    //   text = contiene un texto a buscar en el elemento ejemplo: "texto"
    // action
    //   c  = click
    //   gt = gettext
    //   gv = getvalue
    //   w  = write
    // time = intervalo te tiempo en milisegundos para la busqueda de un objeto
    //        esto es necesario cuando el objeto tarda en aparecer en la pagina
    //        ejemplo: 1000
    //        esto es equivalente a un segundo
    // skip_error = si es false se omitira el error y se continuara con la ejecucion del programa
    //              por defecto es false
    f_test(req.body.json_search);

    async function f_test(actions){
        arr_query = [];
        s_clase = [];

        //Se agranda la pantalla
        await array_driver[num_driver].driver.manage().window().maximize();

        array_driver[num_driver].driver.get(req.body.url_scraping).then(async function () {
            for( let i=0; i<actions.length; i++ ){
                intent_petition = 0;
                end_process = false;
                console.log( actions[i] )
                if( await f_query( actions[i]) == 0 ){
                    i=actions.length;
                }
            }
    
            console.log(`Fin de ejecución de query`)
            res.json(result_final)
            array_driver[num_driver].status = false;
            array_driver[num_driver].driver.quit()
        }, async function (err) {
            console.log("Error contolado 1")
        });
    }
    
    function f_query( actions ) {
        actions.time = !isNaN(!actions.time) && actions.time != "" && actions.time != undefined ? parseInt(actions.time) : config.time_default_interval ;
        actions.skip_error = actions.skip_error == undefined || actions.skip_error == false ? false : true;
        return new Promise(resolve => {
            if( actions.vars != undefined && (actions.vars.class == 'alert_confirm' || actions.vars.class == 'alert_deny') ){
                actions.time = actions.time<2000 ? 2000 : actions.time ;
                s_clase.push(actions.vars.class);
                arr_query.push(
                    async function () {
                        await timeout(actions.time);

                        details = "";
                        if( !end_process ){                                
                            array_driver[num_driver].driver.switchTo().alert().then(async function(e) {
                                details = await e.getText();
                                if( actions.vars.class == 'alert_confirm' )
                                    array_driver[num_driver].driver.switchTo().alert().accept();
                                else if( actions.vars.class == 'alert_deny' )
                                    array_driver[num_driver].driver.switchTo().alert().dismiss();

                                if( !end_process ){
                                    end_process = true;

                                    result_final.push({
                                        "response": "ok",
                                        "details": details,
                                    });
                                    s_clase[s_clase.indexOf(actions.vars.class)] = undefined;
                                    resolve(1);
                                }
                            }, async function (err) {
                                if( !end_process ){
                                    if( intent_petition > (config.int_search_element-1) ){
                                        console.log( `---------------------------\nclass or id ${actions.vars.class} not found` )
                                        end_process = true;
                                        result_final.push({
                                            "response": `fail`,
                                            "details": ``,
                                        });
                                        resolve( !actions.skip_error ? 0 : 1 );
                                    }else if( s_clase.indexOf(actions.vars.class) != -1 ){
                                        console.log( `---------------------------\nNo se encontro el elemento ${actions.vars.class} se intentara buscarlo de nuevo` )
                                        intent_petition++;
                                        arr_query[s_clase.indexOf(actions.vars.class)]()
                                    }
                                }
                            });
                        }else{
                            resolve( !actions.skip_error ? 0 : 1 );
                        }
                    }
                )
            
                async function run(){
                    //Se pausa la aplicacion por un tiempo mientras por tiempo definido por el usuario
                    arr_query[s_clase.indexOf(actions.vars.class)]()
                }
                run()
            }else{
                s_clase.push(actions.vars.class);
                arr_query.push(
                    async function () {
                        if( !end_process ){
                            //Se hace uso de la funcion wait para comprobar que el elemento realmente existe
                            await array_driver[num_driver].driver.wait(until.elementLocated(By.css(actions.vars.class)),config.time_selenium_interval).then(async function (webElement) {
                                const v_object_class = object_class(actions.vars.class);

                                //Se busca el elemento esto es necesario por si la pagina cambia y el elemento no existe
                                await array_driver[num_driver].driver.findElement(v_object_class).then(async function (element) {
                                    end_process = true;
                                    details = "";

                                    if( actions.action == "c" ){
                                        await array_driver[num_driver].driver.executeScript("arguments[0].scrollIntoView()", array_driver[num_driver].driver.findElement(v_object_class));
                                        await array_driver[num_driver].driver.sleep(1000);
                                        await array_driver[num_driver].driver.findElement(v_object_class).click()
                                    } else if( actions.action == "s" ){
                                        details = await array_driver[num_driver].driver.findElement(v_object_class).sendKeys(actions.vars.text);
                                    }  else if( actions.action == "gt" ){
                                        details = await array_driver[num_driver].driver.findElement(v_object_class).getText();
                                    } else if( actions.action == "gv" ){
                                        details = await array_driver[num_driver].driver.findElement(v_object_class).getAttribute("value");
                                    } else if( actions.action == "w" ){
                                        await timeout(100);
                                        await array_driver[num_driver].driver.findElement(v_object_class).clear();
                                        await array_driver[num_driver].driver.findElement(v_object_class).sendKeys(actions.vars.text);
                                        await timeout(1000);
                                    }else if( actions.action == "f" ){
                                        details = await array_driver[num_driver].driver.findElement(v_object_class).getAttribute(actions.attribute);
                                        details = `Coincidencias encontradas: ${details.split(actions.find).length-1}`;
                                    }

                                    result_final.push({
                                        "response": "ok",
                                        "details": details,
                                    });
                                    
                                    s_clase[s_clase.indexOf(actions.vars.class)] = undefined;
                                    resolve(1);
                                }, function (err) {
                                    if( err.name == "NoSuchElementError" ){
                                        console.log( `---------------------------\nNo se encontro el elemento ${actions.vars.class} se intentara buscarlo de nuevo` )
                                    }else{
                                        console.log(`---------------------------\n${err.name}`)
                                    }
                                });
                            }, function (err) {
                                if( intent_petition > (config.int_search_element-1) ){
                                    console.log( `---------------------------\nclass or id ${actions.vars.class} not found` )
                                    end_process = true;
                                    result_final.push({
                                        "response": `fail`,
                                        "details": ``,
                                    });
                                    resolve( !actions.skip_error ? 0 : 1 );
                                }else if( s_clase.indexOf(actions.vars.class) != -1 ){
                                    console.log( `---------------------------\nNo se encontro el elemento ${actions.vars.class} se intentara buscarlo de nuevo` )
                                    intent_petition++;
                                    arr_query[s_clase.indexOf(actions.vars.class)]()
                                }
                            });
                        }else{
                            resolve( !actions.skip_error ? 0 : 1 );
                        }
                    }
                )
            
                async function run(){
                    //Se pausa la aplicacion por un tiempo mientras por tiempo definido por el usuario
                    await timeout(actions.time);
                    arr_query[s_clase.indexOf(actions.vars.class)]()
                }
                run()
            }
        });
    }
    
    function object_class(clase) {
        let object_general_class = webdriver.By.className('class')
        object_general_class.value = clase;
    
        return object_general_class;
    }

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});

module.exports = router;
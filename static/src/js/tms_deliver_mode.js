odoo.define('tms.deliver_mode', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var Session = require('web.session');

    var QWeb = core.qweb;

    var TmsDeliverMode = AbstractAction.extend({
        events: {
            "click .o_tms_btn_Arrival": function () {this.onArrivalButtonClick();},
            "click .o_tms_btn_Delivered": function () {this.onDeliveredButtonClick();},
            "click .o_tms_btn_Returned": function () {this.onReturnedStoreButtonClick();},
            // "click .o_tms_btn_Claims": function () {this.onDeliveredButtonClick();},
        },

        start: function(){
            this.$el.html(QWeb.render('TmsOrdersList', {}));
            console.log('Tmsdelivermode start');
            var def = this._rpc({
                model: 'tms.route',
                method: 'rpc_test',
            })
            .then((companies) => {
                console.log(companies);
                console.log(this.isEmpty({}));
            });
        },

        isEmpty: function(obj){
        for (const prop in obj) {
            if (Object.hasOwn(obj, prop)) {
                return false;
            }
        }
        return true;
        },

        initializeIndexedDb: function() {
            var self = this;

            this.requestDB = window.indexedDB.open(this.dbName, 7);

            this.requestDB.onerror = function (event) {
                console.log('Error opening database');
            };

            this.requestDB.onupgradeneeded = function (event) {
                self.idb = event.target.result;
                if (!self.idb.objectStoreNames.contains(self.storeName)) {
                    var objectStore = self.idb.createObjectStore(self.storeName, {keyPath: 'id', autoIncrement: true});
                }
            };

            this.requestDB.onsuccess = function (event) {
                self.idb = event.target.result;
            };

            this.setSendTmsCron();
        },

        saveIndexedDb: function(fieldDb) {
        let tmsStoreObject = this.idb.transaction(this.storeName, "readwrite").objectStore(this.storeName);
        let requestTms = tmsStoreObject.add(fieldDb);
        requestTms.onsuccess = function () {
            console.log("TMS добавлена в хранилище", requestTms.result);
        };

        requestTms.onerror = function () {
            console.log("Ошибка", requestTms.error);
        };
    },

        async sendServer(id, action) {
        console.log('Отправлено');
        // try {
        //     const done = await this.ormService.call(
        //         "tms.route.order.row",
        //         "sendByIndexedDb",
        //         [[id, action]]
        //     )
        //     if (done) {
        //         console.log(done);
        //         this.deleteFieldsInIndexedDb();
        //     }
        // } catch(error) {
        //     console.error('Произошла ошибка:', error);
        // }
    },

        deleteFieldsInIndexedDb: function(){
        let objectStore = this.idb.transaction(this.storeName, "readwrite").objectStore(this.storeName);
        var clearRequest = objectStore.clear();
        clearRequest.onsuccess = function(event) {
          console.log('Данные успешно удалены из таблицы IndexedDB');
        };
        clearRequest.onerror = function(event) {
          console.error('Ошибка при удалении данных из таблицы IndexedDB', event.target.error);
        };
    },

        checkOnlineStatus: function() {
        return new Promise((resolve, reject) => {
            if (navigator.onLine) {
                resolve("Есть подключение к интернету.");
            } else {
                reject("Нет подключения к интернету.");
            }
        });
        },

        setSendTmsCron: function(){
            if ((!this.idb_last_start) || (this.now - this.idb_last_start > 30000)) {
            setTimeout(() => {
                this.sendSavedRoutes();
            }, 20000);
        }
        },

        sendSavedRoutes: function(){
        let tms_route = this.idb.transaction(this.storeName, 'readonly').objectStore(this.storeName);
        let req = tms_route.getAll(undefined);
        self = this;
        req.onsuccess = function (event) {
            let evlist = event.currentTarget.result;
            console.log(evlist);
            self.checkOnlineStatus().then((message) => {
                console.log(message);
                self.sendServer();
            })
                .catch((error) => {
                    console.error(error);
                });

            // self.idb_last_start = self.now;
            self.setSendTmsCron();
        }
    },

        async onArrivalButtonClick(){
        this.saveIndexedDb({'action': 'arrival', 'id': this.state.orders['id']});

        this.checkOnlineStatus()
            .then((message) => {
                console.log(message);
                this.sendServer();
            })
            .catch((error) => {
                console.error(error);
            })

        // const done = await this.ormService.call(
        //     "tms.route.order.row",
        //     "wasArrival",
        //     [this.state.orders['id']]
        // )
        // if (done) {
        //     this.state.orders['arrival_date'] = done
        // }
    },

        async onReturnedClientButtonClick(){
            this.saveIndexedDb({'action': 'return_cl', 'id': this.state.orders['id']});

            console.log(this.state.orders);
            const done = await this.ormService.call(
                "tms.route.order.row",
                "wasReturnedClient",
                [this.state.orders['id']]
            )
            if (done) {
                this.state.orders['returned_client'] = done
                this.deleteFieldsInIndexedDb()
            }
        },

        async onReturnedStoreButtonClick(){
            console.log(this.state.orders);
            const done = await this.ormService.call(
                "tms.route.order.row",
                "wasReturnedStore",
                [this.state.orders['id']]
            )
            if (done) {
                this.state.orders['returned_store'] = done
            }
        },

        async onDeliveredButtonClick(){
            console.log('Доставлено');

            var def = this._rpc({
                model: 'tms.route.order.row',
                method: 'wasDelivered',
                args: [2,]
            })
            .then((done) => {
                console.log(done);
            });
        },
    });


    core.action_registry.add('tms_deliver_mode', TmsDeliverMode);

    return TmsDeliverMode;
});
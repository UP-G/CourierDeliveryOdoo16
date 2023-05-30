odoo.define('tms.deliver_mode', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');

    var QWeb = core.qweb;

    var TmsDeliverMode = AbstractAction.extend({
        events: {
            "click .o_tms_btn_Arrival": function () {this.onArrivalButtonClick();},
            "click .o_tms_btn_Delivered": function () {this.onDeliveredButtonClick();},
            "click .o_tms_btn_Returned": function () {this.onReturnedClientButtonClick();},
            "click .openPoints": function (ev) {this.showRoutePoints(ev)},
            "click .openOrder": function (ev) {this.showConcreteRoutePoint(ev)},
        },

        start: function(){
            this.initializeIndexedDb();

            this.RoutesKnown = false; // Предполагаем, что маршруты неизвестны
            if(!this.RoutesKnown){
                var def = this._rpc({
                    model: 'tms.route',
                    method: 'getRoutesForDriver',
                })
                .then((routes) => {
                    this.$el.html(QWeb.render('TmsRoute', {'routes': routes, 'props': this}));
                });
            }

            return Promise.all([def, this._super.apply(this, arguments)]);
        },

        showRoutePoints: function(ev) {
            var self = this;
            var routeId = $(ev.currentTarget).closest('div').find('p[data-name]')[0].innerText;
            var routeName = $(ev.currentTarget).closest('div').find('h5[data-name]')[0].innerText;

            console.log(routeId);
            console.log(routeName);
            var def = this._rpc({
                    model: 'tms.route.point',
                    method: 'getRoutesPoints',
                    args: [routeId, ]
                })
                .then((points) => {
                    console.log(points);
                    this.$el.html(QWeb.render('TmsRoutePoints', {'myProp': this, 'routeName': routeName, 'points': points}));
                });
        },

        showConcreteRoutePoint: function(ev) {
            this.pointOrderName = $(ev.currentTarget).closest('div').find('h5[data-name]')[0].innerText;
            var pointId = $(ev.currentTarget).closest('div').find('p[data-name]')[0].innerText;
            self = this;
            console.log(pointId);
            var def = this._rpc({
                    model: 'tms.route.order.row',
                    method: 'showPoint',
                    args: [pointId, ]
                })
                .then((point) => {
                    self.point = point[0];
                    this.$el.html(QWeb.render('TmsPoint', {'orderNum': self.pointOrderName, 'point': self.point}));
                });
        },

        initializeIndexedDb: function() {
            var self = this;
            this.dbName = 'tms_db';
            this.storeName = 'tms_store';

            this.requestDB = window.indexedDB.open(this.dbName, 3);

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
                console.log('IDB инициализирована');
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

        async sendServer(dataTms) {
            console.log('Отправлено');
            try {

                var def = await this._rpc({
                model: 'tms.route.order.row',
                method: 'sendByIndexedDb',
                args: [dataTms,]
                })
                .then((done) => {
                    console.log(done);
                    this.deleteFieldsInIndexedDb();
                    this.$el.html(QWeb.render('TmsPoint', {'orderNum': this.pointOrderName, 'point': this.point}));
                });
            } catch(error) {
                console.error('Произошла ошибка:', error);
            }
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
            setTimeout(() => {
                this.sendSavedRoutes();
            }, 60000);
        },

        sendSavedRoutes: function(){
            let tms_route = this.idb.transaction(this.storeName, 'readonly').objectStore(this.storeName);
            let req = tms_route.getAll(undefined);
            self = this;
            req.onsuccess = function (event) {
                let evlist = event.currentTarget.result;
                let dataToSend = self.deleteDublicatesInIndexedDb(evlist);
                self.checkOnlineStatus().then((message) => {
                    if(dataToSend.length > 0){
                        console.log('Идёт отправка на сервер');
                        self.sendServer(dataToSend);
                    }
                }).catch((error) => {
                    console.error(error);
                });

                self.setSendTmsCron();
            }
        },

        deleteDublicatesInIndexedDb: function(data){
            return data.filter(
              (item, index, array) =>
                index === array.findIndex(
                  (element) =>
                    element.action === item.action && element.point_id === item.point_id
                )
            );
        },

        getDateForOdoo: function() {
            const currentDate = new Date();
            return currentDate.toISOString().slice(0, 19).replace('T', ' ');
        },

        async onArrivalButtonClick(){
            await this.saveIndexedDb({'action': 'arrival', 'point_id': this.point['id'], 'tms_date': this.getDateForOdoo()});
        },

        async onReturnedStoreButtonClick(){
            console.log(this.point);
        },

        async onComplaintButtonClick(){
            console.log(this.point);
        },

        async onReturnedClientButtonClick(){
               await this.saveIndexedDb({'action': 'returned_client', 'point_id': this.point['id'], 'tms_date': this.getDateForOdoo()});
        },

        async onDeliveredButtonClick(){
               await this.saveIndexedDb({'action': 'delivered', 'point_id': this.point['id'], 'tms_date': this.getDateForOdoo()});
        },
    });


    core.action_registry.add('tms_deliver_mode', TmsDeliverMode);

    return TmsDeliverMode;
});
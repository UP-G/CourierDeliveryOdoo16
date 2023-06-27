odoo.define('tms.deliver_mode', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var QWeb = core.qweb;

    var TmsDeliverMode = AbstractAction.extend({
        events: {
            "click .o_tms_btn_Checkin": function () {this.onCheckinButtonClick();},
            "click .o_tms_btn_Checkout": function () {this.onCheckoutButtonClick();},

            "click .o_tms_btn_Arrival": function () {this.onArrivalButtonClick();},
            "click .o_tms_btn_Delivered": function () {this.onDeliveredButtonClick();},
            "click .o_tms_btn_Returned": function () {this.onReturnedClientButtonClick();},
            "click .o_tms_btn_PointList": function () {this.onPointListButtonClick();},

            "click .o_tms_btn_RouteList": function () {this.onRouteListClick();},
            "click .o_tms_btn_Departed": function () {this.onDeparted();},
            "click .o_tms_btn_Finished_Route": function () {this.onFinishedRoute();},
            "click .o_tms_btn_Returned_Store": function () {this.onReturnedStore();},

            "click .openPoints": function (ev) {this.showRoutePoints(ev)},
            "click .openOrder": function (ev) {this.showConcreteRoutePoint(ev)},
        },

        start: function(){
            var self = this;
            self.initializeIndexedDb();
            odoo.tms_props = self;  // TODO: for debug
            odoo.tms_session = session;  // TODO: for debug
            self.Routes = []; // Предполагаем, что открытые смены водителей неизвестны
            self.Attendance = {}; // Предполагаем, что открытые смены водителей неизвестны
            self.Points = []; //
            if(self.isEmpty(self.Attendance)){
                var defAtt = self._rpc({
                    model: 'hr.attendance',
                    method: 'getDriverAttendance',
                    args: [[session.uid]],
                })
                .then((attendance) => {
                    self.Attendance = attendance;
                    console.log('attendance loaded');
                    self.showInterface('TmsRoute');
                });
            }
            if(self.isEmpty(self.Routes)){
                var defRoute = self._rpc({
                    model: 'tms.order',
                    method: 'getRoutesForDriver',
                })
                .then((routes) => {
                    self.Routes = routes;
                    console.log('Routes loaded');
                    odoo.tms_routes = routes;
                    self.showInterface('TmsRoute');
                });
            }
            console.log('start 5');

            return Promise.all([defAtt, defRoute, this._super.apply(this, arguments)]);
        },

        isEmpty: function(obj) {
            return Object.keys(obj).length === 0;
        },

        showInterface: function(template) {
            console.log('show template ' + template);
            if (template == 'TmsRoute') {
                this.$el.html(QWeb.render('TmsRoute', {
                    'routes': this.Routes,
                    'props': this,
                    'session': session,
                    'attendance': this.Attendance,
                }));
            } else if (template == 'TmsRoutePoints') {
                this.$el.html(QWeb.render('TmsRoutePoints', {
                    'myProp': this, 
                    'routeName': this.routeName, 
                    'points': this.Points
                }));
            }
        },

        showRoutePoints: function(ev) {
            var routeId = $(ev.currentTarget).closest('div').find('p[data-name]')[0].innerText;
            var routeName = $(ev.currentTarget).closest('div').find('h3[data-name]')[0].innerText;

            console.log(routeId);
            console.log(routeName);
            this.route_id = routeId;
            this.route_name = routeName;
            var def = this._rpc({
                    model: 'tms.order.row',
                    method: 'getRoutesPoints',
                    args: [routeId, ]
                })
                .then((points) => {
                    this.Points = points;
                    this.showInterface('TmsRoutePoints');
                });
        },

        showConcreteRoutePoint: function(ev) {
            this.pointOrderName = $(ev.currentTarget).closest('div').find('h5[data-name]')[0].innerText;
            var pointId = $(ev.currentTarget).closest('div').find('p[data-name]')[0].innerText;
            self = this;
            console.log(pointId);
            var def = this._rpc({
                    model: 'tms.order.row',
                    method: 'showPoint',
                    args: [pointId, ]
                })
                .then((point) => {
                    self.point = point[0];
                    this.$el.html(QWeb.render('TmsPoint', {'orderNum': self.pointOrderName, 'point': self.point}));
                });
        },

        initializeIndexedDb: function() {
            return new Promise((resolve, reject) => {
                if (navigator.onLine) {
                    var self = this;
                    this.dbName = 'tms_db';
                    this.storeName = 'tms_store';

                    this.requestDB = indexedDB.open(this.dbName, 20);

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
                        resolve(self.idb);
                        console.log('IDB инициализирована');
                    };

                    this.setSendTmsCron();
                } else {
                    reject('No db');
                }
            });
        },

        async saveIndexedDb(fieldDb) {
            if(!this.idb){
                 let idb = await this.initializeIndexedDb();
            }

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
                model: 'tms.order.row',
                method: 'saveInDB',
                args: [dataTms,]
                })
                .then((done) => {
                    console.log(done);
                    this.deleteFieldsInIndexedDb();
                    // this.$el.html(QWeb.render('TmsPoint', {'orderNum': this.pointOrderName, 'point': this.point}));
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
            if(!this.idb){
                this.initializeIndexedDb();
                let tms_route = this.idb.transaction(this.storeName, 'readonly').objectStore(this.storeName);
            } else {
                let tms_route = this.idb.transaction(this.storeName, 'readonly').objectStore(this.storeName);
                let req = tms_route.getAll(undefined);
                self = this;
                req.onsuccess = function (event) {
                    let evlist = event.currentTarget.result;
                    // let dataToSend = self.deleteDublicatesInIndexedDb(evlist);
                    self.checkOnlineStatus().then((message) => {
                        if (evlist.length > 0) {
                            console.log('Идёт отправка на сервер');
                            self.sendServer(evlist);
                        }
                    }).catch((error) => {
                        console.error(error);
                    });

                    self.setSendTmsCron();
                }
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
            this.point['arrival_date'] = this.getDateForOdoo();
            await this.saveIndexedDb({'action': 'arrival', 'point_id': this.point['id'], 'tms_date': this.point['arrival_date']});
            this.$el.html(QWeb.render('TmsPoint', {'orderNum': this.pointOrderName, 'point': this.point}));
        },

        async onReturnedStoreButtonClick(){
            console.log(this.point);
        },

        async onComplaintButtonClick(){
            console.log(this.point);
        },

        async onReturnedClientButtonClick(){
              this.point['returned_client'] = this.getDateForOdoo();
               await this.saveIndexedDb({'action': 'returned_client', 'point_id': this.point['id'], 'tms_date': this.point['returned_client']});
               this.$el.html(QWeb.render('TmsPoint', {'orderNum': this.pointOrderName, 'point': this.point}));

        },

        async onDeliveredButtonClick(){
            this.point['delivered'] = this.getDateForOdoo();
               await this.saveIndexedDb({'action': 'delivered', 'point_id': this.point['id'], 'tms_date': this.point['delivered']});
               this.$el.html(QWeb.render('TmsPoint', {'orderNum': this.pointOrderName, 'point': this.point}));
        },

        async onCheckinButtonClick(){
            // TODO: open new hr.attendance
//               await this.saveIndexedDb({'action': 'checkin', 'driver_id': session.uid, 'tms_date': this.getDateForOdoo()});
//            this.showInterface('TmsRoute');
        },

        async onCheckoutButtonClick(){
            // TODO: open new hr.attendance
//               await this.saveIndexedDb({'action': 'checkout', 'driver_id': session.uid, 'tms_date': this.getDateForOdoo()});
//            this.showInterface('TmsRoute');
        },

        async onPointListButtonClick(){
            this.showInterface('TmsRoutePoints');
        },

        async onRouteListClick(){
            this.showInterface('TmsRoute');
        },

        async onDeparted(){
               await this.saveIndexedDb({'action': 'departed', 'route_id': this.route_id, 'tms_date': this.getDateForOdoo()});
        },

        async onFinishedRoute(){
               await this.saveIndexedDb({'action': 'finished', 'route_id': this.route_id, 'tms_date': this.getDateForOdoo()});
        },

        async onReturnedStore(){
               await this.saveIndexedDb({'action': 'returned_store', 'route_id': this.route_id, 'tms_date': this.getDateForOdoo()});
        },
    });


    core.action_registry.add('tms_deliver_mode', TmsDeliverMode);

    return TmsDeliverMode;
});
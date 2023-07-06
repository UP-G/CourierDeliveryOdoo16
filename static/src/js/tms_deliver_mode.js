odoo.define('tms.deliver_mode', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var field_utils = require('web.field_utils');
    var Dialog = require('web.Dialog');
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

            "click .points": function (ev) {this.showRoutePoints(ev)},
            "click .o_tms_concrete-point-event": function (ev) {this.showConcreteRoutePoint(ev)},

            "click .o_tms_attendance_sign": function() {this.onUpdateAttendanceStatus()},
            "click .o_tms_update_routes": function() {this.onUpdateCacheClick()}
        },

        willStart: async function () {
            return this._super.apply(this, arguments).then(()=> {
                window.addEventListener('beforeunload', () => {
                    this.saveStateInIndexeddb();
                });
            });
        },

        start: async function(){
            return this._super.apply(this, arguments).then(async ()=> {
                $(".o_navbar").css("display", "none");
                odoo.tms_props = this;  // TODO: for debug
                odoo.tms_session = session;  // TODO: for debug
                this.initState();
                await this.initDeliveryMode();
            });
        },

        initState: function(){
            this.tmsContext = {
                cacheLoadTime: new Date(),
                attendance: {
                    check_out: null,
                    tz_user: null,
                },
                routes: [],
                routePoints: {
                    routeId: null,
                    routeName: null,
                    departedOnRoute: '',
                    returnedToTheStore: '',
                    finishedTheRoute: '',
                    routeDepartClick: false,
                    routeFinishClick: false,
                    routeReturnClick: false,
                    checkAllFinishOrder: false,
                    points: [],
                },
                concretePoint: {
                    pointId: null,
                    pointOrderName: null,
                    routeDeliverClick: false,
                    routeReturnClientClick: false,
                    point: {},
                },
            };

            this.routes = [];

            this.database = {
                idb: null,
                idb_name: 'tms_idb',
                idb_stores: {
                    'tms_routes_cache': 'tms_routes_cache',
                    'tms_order': 'tms_order',
                    'tms_order_row': 'tms_order_row',
                    'tms_state_cache': 'tms_state_cache'},
            }
        },

        initDeliveryMode: async function(){
            await this.initializeIndexedDbv2();
            await this.putRoutesInCache();
            // await this.loadLastState(); //Закомментить, если нужно возвращаться на главную, а не на последнюю до перезагрузки/выхода страницу
            await this.loadEmployee();
            await this.loadRoutes();

            this.showInterfaceActual();
        },

        // loadAttendance: async function (){
        //     if(this.isEmpty(this.tmsContext.attendance)){
        //         let attendance = await this.getAttendanceByController();
        //         await this.setAttendanceState(attendance);
        //         console.log('attendance loaded');
        //         // this.showInterface('TmsRoute');
        //     }
        // },

        loadRoutes: async function (){
            let cache_routes = await this.loadRoutesCache();
            delete cache_routes.id;
            this.routes = cache_routes;
            console.log(cache_routes)

            let routes = cache_routes.map(function (route) {
                let newRoute = Object.assign({}, route);
                delete newRoute.points;
                return newRoute;
            });

            this.setRoutesState(routes);
        },

        loadRoutesCache: function() {
            return new Promise((resolve, reject) => {
                var transaction = this.database.idb.transaction(this.database.idb_stores.tms_routes_cache, 'readonly');
                var objectStore = transaction.objectStore(this.database.idb_stores.tms_routes_cache);
                var getRequest = objectStore.getAll();

                getRequest.onsuccess = (event) => {
                    var data = event.target.result;
                    this.cacheLoadTime = new Date();
                    resolve(data[0]);
                };

                getRequest.onerror = function (event) {
                    reject(event.target.error);
                };
            });
        },

        loadEmployee: async function (){
            let employees = await this.getEmployeeByController()
            if (employees.length == 0) {
                return null
            }
            this.employee = employees.length && employees[0];

            console.log(employees[0].attendance_state == 'checked_in')
            if (employees[0].attendance_state == 'checked_in') {
                this.tmsContext.attendance.check_out = employees[0].attendance_state
                this.tmsContext.attendance.tz_user = employees[0].tz
                console.log(this.tmsContext.attendance)
                await this.setAttendanceState({'check_out': 'check_out',
            'tz_user': employees[0].tz})
            } else {
                this.tmsContext.attendance.check_out = false
            }

            await this.showInterfaceActual()
        },

        loadLastState: function(){
            this.getAllDataFromCache()
                .then((data) => {
                    delete data[0].id;
                    this.tmsContext = data[0];
                    console.log(this.tmsContext);
                })
                .catch(function (error) {
                    console.error('Ошибка при получении данных из tms_cache:', error);
                });
        },

        putRoutesInCache: async function(){
            let routes = await this.getRoutesAndPointsByController();
            console.log(routes);
            this.saveRoutesInCache(routes);
        },

        getAllDataFromCache: function () {
            return new Promise((resolve, reject) => {
                var transaction = this.database.idb.transaction(this.database.idb_stores.tms_state_cache, 'readonly');
                var objectStore = transaction.objectStore(this.database.idb_stores.tms_state_cache);
                var getRequest = objectStore.getAll();

                getRequest.onsuccess = function (event) {
                    var data = event.target.result;
                    resolve(data);
                };

                getRequest.onerror = function (event) {
                    reject(event.target.error);
                };
            });
        },

        isEmpty: function(obj) {
            return Object.keys(obj).length === 0;
        },

        setRoutesState: function(routes){
            this.tmsContext.routes = routes;
        },

        setAttendanceState: function(attendance){
            this.tmsContext.attendance = attendance;
        },

        setPointsState: function(points){
            console.log(points);
            this.tmsContext.routePoints.points = points;
        },

        setConcretePointState: function(point){
            console.log(point);
            this.tmsContext.concretePoint.point = point;
        },

        showInterfaceActual: function() {
            this.$el.html(QWeb.render('TmsBase', {'context': this.tmsContext, 'widget': {
                'visible': true
            }}));
        },

        showRoutePoints: async function(ev) {
            this.tmsContext.routePoints.routeId = ev.currentTarget.getAttribute("id");


            let route = this.routes.find((route) => {
                return route.id === parseInt(this.tmsContext.routePoints.routeId);
            });
            console.log(route);

            this.tmsContext.routePoints.routeName = route.name;
            this.tmsContext.routePoints.departedOnRoute = route.departed_on_route;
            this.tmsContext.routePoints.returnedToTheStore = route.returned_to_the_store;
            this.tmsContext.routePoints.finishedTheRoute = route.finished_the_route;
            this.tmsContext.routePoints.checkAllFinishOrder = route.points.every(obj => obj.returned_client || obj.delivered);

            let points = route ? route.points : [];

            this.setPointsState(points);
            this.showInterfaceActual();
        },


        showConcreteRoutePoint: async function(ev) {
            this.tmsContext.concretePoint.pointId = ev.currentTarget.getAttribute("id");

            let routePoint = null;
            this.routes.forEach( (route) => {
                var foundPoint = route.points.find((point) => {
                    return point.id === parseInt(this.tmsContext.concretePoint.pointId);
                });
                if (foundPoint) {
                    routePoint = foundPoint;
                    return;
                }
            });

            this.tmsContext.concretePoint.pointOrderName = routePoint.impl_num;
            this.tmsContext.concretePoint.deliveryAddress = routePoint.street
            this.tmsContext.concretePoint.phone = routePoint.phone
            
            this.setConcretePointState(routePoint);
            this.showInterfaceActual();
        },

        initializeIndexedDbv2: function() {
            return new Promise((resolve, reject) => {

                   this.requestDB = indexedDB.open(this.database.idb_name, 4);

                   this.requestDB.onerror = function (event) {
                       console.log('Error opening database');
                   };

                   this.requestDB.onupgradeneeded = (event)  => {
                       this.idb = event.target.result;
                       Object.values(this.database.idb_stores).forEach((storeName)  =>{
                           if (!this.idb.objectStoreNames.contains(storeName)) {
                               this.idb.createObjectStore(storeName, {keyPath: 'id', autoIncrement: true});
                           }
                       });
                   };

                   this.requestDB.onsuccess = (event)  => {
                       this.database.idb = event.target.result;
                       resolve(this.database.idb);
                       console.log('IDB инициализирована');
                   };

                   this.setSendTmsCronv2();
                   this.setDeleteTmsCron();
                   //this.setDeleteNoActualRoutesCron();
            });
       },

        async saveIndexedDbv2(storeName, fieldDb){
            if(!this.database.idb){
                let idb = await this.initializeIndexedDbv2();
            }

            let tmsStoreObject = this.database.idb.transaction(storeName, "readwrite").objectStore(storeName);

            let requestTms = tmsStoreObject.add(fieldDb);
            console.log(fieldDb);
            requestTms.onsuccess = function () {
                console.log("Данные добавлены в хранилище ", storeName, requestTms.result);
            };

            requestTms.onerror = function () {
                console.log("Ошибка при записи в ", storeName, requestTms.error);
            };
        },

        async sendServerv2(storeName, dataTms) {
            try {
                if(storeName === this.database.idb_stores.tms_order){
                    let result = await this.sendTmsOrderData(dataTms);
                    if(result) {
                        this.updateSentAttribute(storeName, dataTms)
                    }
                } else if (storeName === this.database.idb_stores.tms_order_row) {
                    let result = await this.sendTmsOrderRowData(dataTms);
                    if(result){
                        this.updateSentAttribute(storeName, dataTms)
                    }
                }
            } catch(error) {
                console.error('Произошла ошибка:', error);
            }
        },

        updateSentAttribute: function(storeName, searchObjects){
            searchObjects.forEach((searchObject) => {
                let transaction = this.database.idb.transaction(storeName, 'readwrite');
                let objectStore = transaction.objectStore(storeName);
                let cursorRequest = objectStore.openCursor();

                cursorRequest.onsuccess = function (event) {
                    let cursor = event.target.result;

                    if (cursor) {
                        let record = cursor.value;

                        if (record.action === searchObject.action && record.route_id === searchObject.route_id) {

                            record.sent = true;

                            let updateRequest = cursor.update(record);

                            updateRequest.onsuccess = function(event) {
                              console.log('Значение sent обновлено для записи в IndexedDB');
                            };
                            updateRequest.onerror = function(event) {
                              console.error('Ошибка при обновлении значения sent в IndexedDB', event.target.error);
                            };

                            return;
                        }

                        cursor.continue();
                    } else {
                        console.log('Запись не найдена в IndexedDB для текущего объекта');
                    }
                };
            });
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

        setSendTmsCronv2:  function(){
            setTimeout(() => {
                 this.sendSavedRoutesv2();
                 this.setSendTmsCronv2();
            }, 6000);
        },

        setDeleteTmsCron: function() {
            setTimeout(() => {
                 this.deleteSentFieldsInIndexedDb();
                 this.setDeleteTmsCron();
            }, 20000);
        },

        setDeleteNoActualRoutesCron: function(){
            setTimeout(() => {
                this.deleteNoActualRoutes();
                this.setDeleteNoActualRoutesCron();
            }, 30000);
        },

        deleteNoActualRoutes: function(){
            let filteredRoutes = this.routes.filter(function (route) {
                if (route.finished_the_route) {
                    return false;
                }

                if(!route.departed_on_route){
                    if (new Date() - this.cacheLoadTime >= 8 * 60 * 60 * 1000){
                       return false;
                    }
                }
                return true;
            });

            this.saveRoutesInCache(filteredRoutes);

            this.loadRoutes();

            this.showInterfaceActual();
        },

        sendSavedRoutesv2: function(){
            if(!this.database.idb){
                this.initializeIndexedDbv2().then(() => {
                    Object.values(this.database.idb_stores).forEach((storeName) => {
                        const transaction = this.database.idb.transaction(storeName, 'readonly');
                        const objectStore = transaction.objectStore(storeName);
                        const req = objectStore.getAll(undefined);

                        req.onsuccess = (event) => {
                            const evlist = event.target.result;
                            this.handleSendRoutes(evlist);
                        };
                    });
                }).catch((error) => {
                    console.error(error);
                });
            } else {
                Object.values(this.database.idb_stores).forEach((storeName) => {
                    let transaction = this.database.idb.transaction(storeName, 'readonly');
                    let objectStore = transaction.objectStore(storeName);
                    let req = objectStore.getAll(undefined);

                    req.onsuccess = (event) => {
                        const evlist = event.target.result;
                        this.handleSendRoutes(storeName, evlist);
                    };

                });
            }
        },

        handleSendRoutes: function(storeName,evlist) {
            this.checkOnlineStatus().then(() => {
                if (evlist.length > 0) {
                    this.sendServerv2(storeName, evlist);
                }
                }).catch((error) => {
                    console.error(error);
            });
        },


        deleteSentFieldsInIndexedDb: function(){
            Object.values(this.database.idb_stores).forEach((storeName) => {
                let transaction = this.database.idb.transaction(storeName, 'readwrite');
                let objectStore = transaction.objectStore(storeName);
                let cursorRequest = objectStore.openCursor();

                cursorRequest.onsuccess = function (event) {
                    let cursor = event.target.result;

                    if (cursor) {
                        let record = cursor.value;

                        if (record.sent === true) {
                            let deleteRequest = cursor.delete();
                            deleteRequest.onsuccess = function (event) {
                                // console.log('Запись успешно удалена из хранилища', storeName);
                            };
                            deleteRequest.onerror = function (event) {
                                console.error('Ошибка при удалении записи из хранилища', storeName, event.target.error);
                            };
                        }

                        cursor.continue();
                    } else {
                        // console.log('Обход курсора завершен для хранилища', storeName);
                    }
                };
            });
        },

        saveStateInIndexeddb: function(){
            var transaction = this.database.idb.transaction(this.database.idb_stores.tms_state_cache, 'readwrite');
            var objectStore = transaction.objectStore(this.database.idb_stores.tms_state_cache);

            var clearRequest = objectStore.clear();

            clearRequest.onsuccess = function (event) {
                var putRequest = objectStore.put(this.tmsContext);
                putRequest.onsuccess = function (event) {
                    console.log('Кеш состояния успешно записан');
                };

                putRequest.onerror = function (event) {
                    console.error('Ошибка при записи в кеш состояния', event.target.error);
                };
            }.bind(this);

            clearRequest.onerror = function (event) {
                console.error('Ошибка при очистке кеша состояния', event.target.error);
            };
        },

        saveRoutesInCache: function(routes){
            var transaction = this.database.idb.transaction(this.database.idb_stores.tms_routes_cache, 'readwrite');
            var objectStore = transaction.objectStore(this.database.idb_stores.tms_routes_cache);

            var clearRequest = objectStore.clear();

            clearRequest.onsuccess = function (event) {
                var putRequest = objectStore.put(routes);
                putRequest.onsuccess = function (event) {
                    console.log('Кеш маршрутов успешно записан');
                }.bind(this);

                putRequest.onerror = function (event) {
                    console.error('Ошибка при записи в кеш маршрутов', event.target.error);
                };
            }.bind(this);

            clearRequest.onerror = function (event) {
                console.error('Ошибка при очистке кеша маршрутов', event.target.error);
            };
        },

        getDateForOdoo: function() {
            const currentDate = new Date();
            // return currentDate.toLocaleString("ru-RU", {timeZone: this.tmsContext.attendance.tz_user});
            return currentDate.toISOString().slice(0, 19).replace('T', ' ');
        },

        getAttendanceByController: async function(){
            var self = this;
            let def = this._rpc({
                    model: 'hr.employee',
                    method: 'attendance_manual',
                    args: [[self.employee.id], 'hr_attendance.hr_attendance_action_my_attendances'],
                    context: session.user_context,
                })
                .then(function(result) {
                    return result.action.attendance;
                });
                return def
        },

        getEmployeeByController: async function() {
            var defEmployee = this._rpc({
                    model: 'hr.employee',
                    method: 'search_read',
                    args: [[['user_id', '=', this.getSession().uid]], ['attendance_state', 'name', 'hours_today', 'tz']],
                    context: session.user_context,
                })
                .then((res) => {
                    console.log(res)
                    return res
                });
            return await defEmployee
        },

        getRoutesAndPointsByController: function(){
            console.log('user ID: ' + session.uid)
            var defRoute = this._rpc({
                model: 'tms.order',
                method: 'getRoutesAndPoints',
                args: [session.uid, this.tmsContext.attendance.tz_user] //Взятие точек и маршрутов по id пользователя и его tz
            })
                .then((routes) => {
                    return routes;
                });
            return defRoute;
        },

        sendTmsOrderRowData: async function(datesTmsOrderRow){
            var def = await this._rpc({
                model: 'tms.order.row',
                method: 'saveDatesTmsOrderRow',
                args: [datesTmsOrderRow,]
            })
                .then((done) => {
                    return done;
                });
            return def;
        },

        sendTmsOrderData: async function(datesTmsOrder){
            var def = await this._rpc({
                model: 'tms.order',
                method: 'saveDatesTmsOrder',
                args: [datesTmsOrder,]
            })
                .then((done) => {
                    return done;
                });
            return def;
        },

        
        async onArrivalButtonClick(){
            this.tmsContext.concretePoint.point['arrival_date'] = this.getDateForOdoo();
            await this.saveIndexedDbv2(this.database.idb_stores.tms_order_row,
                {
                    'action': 'arrival',
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'tms_date': this.tmsContext.concretePoint.point['arrival_date'],
                    'sent': false,
                });
            this.showInterfaceActual();
        },

        async onReturnedStoreButtonClick(){
            console.log(this.tmsContext.concretePoint.point);
        },

        async onComplaintButtonClick(){
            console.log(this.tmsContext.concretePoint.point);
        },

        async onReturnedClientButtonClick(){
            
                this.tmsContext.concretePoint.point['returned_client'] = this.getDateForOdoo();
                await this.saveIndexedDbv2(this.database.idb_stores.tms_order_row,
                    {
                        'action': 'returned_client',
                        'point_id': this.tmsContext.concretePoint.point['id'],
                        'tms_date': this.tmsContext.concretePoint.point['returned_client'],
                        'sent': false,
                    });
                this.showInterfaceActual();
                this.tmsContext.concretePoint.routeReturnClientClick = true;
            
        },

        async onUpdateCacheClick(){
            await this.putRoutesInCache();
            await this.loadRoutes();
            this.showInterfaceActual();
        },

        async onDeliveredButtonClick(){
            
                this.tmsContext.concretePoint.point['delivered'] = this.getDateForOdoo();
                await this.saveIndexedDbv2(this.database.idb_stores.tms_order_row,
                    {
                        'action': 'delivered',
                        'point_id': this.tmsContext.concretePoint.point['id'],
                        'tms_date': this.tmsContext.concretePoint.point['delivered'],
                        'sent': false,
                    });
                
                this.showInterfaceActual();
                this.tmsContext.concretePoint.routeDeliverClick = true;
            
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
            this.setConcretePointState({});
            let route = this.routes.find((route) => {
                return route.id === parseInt(this.tmsContext.routePoints.routeId);
            });
            this.tmsContext.routePoints.checkAllFinishOrder = route.points.every(obj => obj.returned_client || obj.delivered);
            this.showInterfaceActual();
        },

        async onUpdateAttendanceStatus(){
                let attendance = await this.getAttendanceByController();
                this.putRoutesInCache();
                console.log(attendance)
                if (attendance.check_out == false) {
                    await this.setAttendanceState({'check_out': 'check_out'});
                } else {
                    await this.setAttendanceState({
                        'check_out': false,
                        'hours_today': field_utils.format.float_time(attendance.worked_hours)
                    });
                }
                this.showInterfaceActual();
        },

        async onRouteListClick(){
            this.setPointsState([]);
            this.showInterfaceActual();
        },

        async onDeparted(){
            
                this.routes.forEach((route)=> {
                    if (route.id === parseInt(this.tmsContext.routePoints.routeId)) {
                        route.departed_on_route = this.getDateForOdoo();
                        this.tmsContext.routePoints.departedOnRoute = this.getDateForOdoo();
                        this.showInterfaceActual();
                    }
                });
                
                this.setRoutesState(this.routes);
                
                this.saveRoutesInCache(this.routes);

                await this.saveIndexedDbv2(this.database.idb_stores.tms_order,
                {
                    'action': 'departed',
                    'route_id': this.tmsContext.routePoints.routeId,
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                });

                this.tmsContext.routePoints.routeDepartClick = true;
                
        },

        async onFinishedRoute(){
            

                this.routes.forEach((route)=> {
                    if (route.id === parseInt(this.tmsContext.routePoints.routeId)) {
                        route.finished_the_route = this.getDateForOdoo();
                        this.tmsContext.routePoints.finishedTheRoute = this.getDateForOdoo();
                        this.showInterfaceActual();
                    }
                });
                
                this.setRoutesState(this.routes);
                
                this.saveRoutesInCache(this.routes);

                await this.saveIndexedDbv2(this.database.idb_stores.tms_order,
                    {
                        'action': 'finished',
                        'route_id': this.tmsContext.routePoints.routeId,
                        'tms_date': this.getDateForOdoo(),
                        'sent': false,
                    });
                this.tmsContext.routePoints.routeFinishClick = true;
                
           
        },

        async onReturnedStore(){
            
                this.routes.forEach((route)=> {
                    if (route.id === parseInt(this.tmsContext.routePoints.routeId)) {
                        route.returned_to_the_store = this.getDateForOdoo();
                        this.tmsContext.routePoints.returnedToTheStore= this.getDateForOdoo();
                        this.showInterfaceActual();
                    }
                });

                this.setRoutesState(this.routes);

                this.saveRoutesInCache(this.routes);

                await this.saveIndexedDbv2(this.database.idb_stores.tms_order,
                    {
                        'action': 'returned_store',
                        'route_id': this.tmsContext.routePoints.routeId,
                        'tms_date': this.getDateForOdoo(),
                        'sent': false,
                    });
                this.tmsContext.routePoints.routeReturnClick = true;
            
                
        },

    });

    var QWeb = core.qweb;

    core.action_registry.add('tms_deliver_mode', TmsDeliverMode);

    return TmsDeliverMode;
});
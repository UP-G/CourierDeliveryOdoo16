odoo.define('tms.deliver_mode', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var field_utils = require('web.field_utils');
    var TmsDeliverMode = AbstractAction.extend({
        events: {
            // "click .o_tms_btn_Checkin": function () {this.onCheckinButtonClick();},
            // "click .o_tms_btn_Checkout": function () {this.onCheckoutButtonClick();},

            "click .o_tms_btn_Arrival": function () {this.onArrivalButtonClick();},
            "click .o_tms_btn_Delivered": function () {this.onDeliveredButtonClick();}, //Кнопка Доставленно клиенту
            "click .o_tms_btn_Returned": function () {this.onReturnedClientButtonClick();}, //Кнопка Возрат принят
            "click .o_tms_btn_PointList": function () {this.onPointListButtonClick();},
            "click .o_tms_btn_Cancel_row": function () {this.onPointCancelRowClick();}, // Кнопка отмены заказа
            "click .o_tms_btn_change_status_row": function() {this.onPointChangeStatusRow();},

             "click .o_tms_modal_switch_order_send": function() { this.tryToAction()},

            "click .o_tms_btn_RouteList": function () {this.onRouteListClick();},
            "click .o_tms_btn_Departed": function () {this.onDeparted();},
            "click .o_tms_btn_Finished_Route": function () {this.onFinishedRoute();},
            "click .o_tms_btn_Returned_Store": function () {this.onReturnedStore();},

            "click .points": function (ev) {this.showRoutePoints(ev)},
            "click .o_tms_concrete-point-event": function (ev) {this.showConcreteRoutePoint(ev)},

            "click .o_tms_attendance_sign": function() {this.onUpdateAttendanceStatus()},
            "click .o_tms_update_routes": function() {this.onUpdateCacheClick()},
            "click .o_tms_dropdown_item.closed_routes": function() {this.onShowClosedRoute();},
            "click .o_tms_button_filtered.closed-route-row":function() { this.onShowClosedRowRoute();},

            "click .o_tms_modal_feedback_send": function() {this.tryToAction();}, // Кнопка потверждения отмены заказа
            "click .o_tms_modal_btn_ok": function() {this.tryToAction();}, // Кнопка Ок в modal
            "click .o_tms_modal_btn_cancel": function() { this.onCancelModalClick();}, // Кнопка Cancel в modal
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
                    tz_user: 'Europe/Moscow',
                    hours_today: 0,
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
                filter: {
                    showClosedRoute: false,
                    showClosedRouteRow: true, //Скрытие обработанных точек маршрута
                },
                cancellation: [], //Список причин отказа
                statusOrder: [
                    {'id': 3, 'action_type': 'clear_date_row', 'name': 'Сбросить'},
                ]
            };

            this.widget = {
                confirmation: false, // Окно потверждение
                feedBack: false, // Окно с возможностью оставить коментарий
                switchOrder: false, //Окно для смены статуса заказа
                viewType: null,
            }

            this.action = {
                type: null
            }

            this.routes = [];

            this.browse = {
                'id': null,
                'browse_uid': ''
            }

            this.database = {
                idb: null,
                idb_name: 'tms_idb',
                idb_stores: {
                    'tms_routes_cache': 'tms_routes_cache',
                    'tms_order': 'tms_order',
                    'tms_order_row': 'tms_order_row',
                    'tms_state_cache': 'tms_state_cache',
                    'tms_browser_uid': 'tms_browser_uid', //Уникальный индефикатор пользователя
                },
            }
        },

        initDeliveryMode: async function(){
            await this.initializeIndexedDbv2();
            //await this.putRoutesInCache();
            // await this.loadLastState(); //Закомментить, если нужно возвращаться на главную, а не на последнюю до перезагрузки/выхода страницу
            await this.loadEmployee();
            await this.loadRoutes();
            await this.loadCancellationOrderRow();
            await this.loadBrowseUidUser()
            this.showInterfaceActual();
        },

        loadRoutes: async function (){
            let cache_routes = await this.loadRoutesCache();
            delete cache_routes.id;
            this.routes = cache_routes;

            let routes = cache_routes.map((route) => {
                let newRoute = Object.assign({}, route);

                delete newRoute.points;
                return newRoute;
            });
            this.setRoutesState(routes);
        },

        loadCancellationOrderRow: async function() {
            let cancellation = await this.getCancellationByController()
            this.tmsContext.cancellation = cancellation
            console.log(cancellation)
        },

        loadCache: function(storeName) {
            return new Promise((resolve, reject) => {
              var transaction = this.database.idb.transaction(storeName, 'readonly');
              var objectStore = transaction.objectStore(storeName);
              var getRequest = objectStore.getAll();
          
              getRequest.onsuccess = (event) => {
                var data = event.target.result;
                this.cacheLoadTime = new Date();
                let result = data[0] !== undefined ? data[0] : [];
                resolve(result);
              };
          
              getRequest.onerror = function (event) {
                reject(event.target.error);
              };
            });
          },

        loadRoutesCache: function() {
            return this.loadCache(this.database.idb_stores.tms_routes_cache);
        },

        loadBrowseUidUserCache: function() {
            return this.loadCache(this.database.idb_stores.tms_browser_uid);
        },

        loadBrowseUidUser: async function() {
            let cache_browse_uid = await this.loadBrowseUidUserCache()
            let browse_uid = await this.getBrowseUidUserByController(cache_browse_uid.browse_uid)
            if (browse_uid.browse_uid == cache_browse_uid.browse_uid) {
                await this.setBrowseUidUser(cache_browse_uid)
            } else {
                await this.saveBrowseUidUserInCache()
                await this.setBrowseUidUser(browse_uid)
            }
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
                this.tmsContext.attendance.check_out = false;
                this.tmsContext.attendance.tz_user = employees[0].tz;
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

        isLastCloseRoutePoint: function() {
          let route = this.routes.find((route) => {
                return route.id === parseInt(this.tmsContext.routePoints.routeId);
            });
            this.tmsContext.routePoints.checkAllFinishOrder = route.points.every(obj => obj.returned_client || obj.delivered || obj.cancel_delivery);
            return this.tmsContext.routePoints.checkAllFinishOrder
        },

        // setSwitchState: function() {
        //     let select = document.getElementById("selectionSwitch");
        //     this.action.type = select.value

        //     this.action.object = {
        //         'row': this.database.idb_stores.tms_order_row,
        //         'field': {
        //             'action': this.action.type,
        //             'point_id': this.tmsContext.concretePoint.point['id'],
        //             'switch_status_row': true,
        //             'tms_date': this.getDateForOdoo(),
        //             'sent': false,
        //         }};
        //     this.widget.switchOrder = false
        //     this.display_message('switchStatusOrder')
        // },

        setRoutesState: function(routes){
            this.tmsContext.routes = routes;
        },

        setBrowseUidUser: function(browser){
            this.browse = browser
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

        setDateOrderInOrderRow: function() {

            if (this.action.type === 'departed') {
                const route = this.routes.find(route => route.id === parseInt(this.tmsContext.routePoints.routeId));
                if (route) {
                    route.departed_on_route = this.getDateTranformByTz();
                    this.tmsContext.routePoints.departedOnRoute = route.departed_on_route;
                }
            } else if (this.action.type === 'finished') {
                const route = this.routes.find(route => route.id === parseInt(this.tmsContext.routePoints.routeId));
                if (route) {
                    route.finished_the_route = this.getDateTranformByTz();
                    this.tmsContext.routePoints.finishedTheRoute = route.finished_the_route;
                }
            } else if (this.action.type === 'returned_store') {
                const route = this.routes.find(route => route.id === parseInt(this.tmsContext.routePoints.routeId));
                if (route) {
                    route.returned_to_the_store = this.getDateTranformByTz();
                    this.tmsContext.routePoints.returnedToTheStore = route.returned_to_the_store;
                }
            } else if (this.action.type === 'cancelOrderRow') {
                const date = this.getDataForFeedBack();
                if (!date) {
                    // Выводить варнинг
                    return;
                }
            } else if (this.action.type === 'clear_date_row') {
                const fieldsToClear = ['returned_client', 'delivered', 'cancel_delivery'];

                fieldsToClear.forEach(field => {
                this.tmsContext.concretePoint.point[field] = false;
                });
            }
        },

        showInterfaceActual: function() {
            this.$el.html(QWeb.render('TmsBase', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
        },

        display_message: function(viewTypeMessage) {
            if (viewTypeMessage === 'confirm') {
                this.$(".o_tms_modal_confirm").html(QWeb.render('TmsModalConfirm', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
            if (viewTypeMessage === 'feedback') {
                this.$(".o_tms_modal_feedback").html(QWeb.render('TmsModalFeedBack', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
            if (viewTypeMessage === 'switchStatusOrder') {
                this.$(".o_tms_modal_switch_s_order").html(QWeb.render('TmsModalSwitchStatusOrder', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
        },

        display_content: function(viewTypeContent) {
            if (viewTypeContent === 'start') {
                $(".o_tms_route").css("display", "block");
                $(".o_tms_cards_route_points").css("display", "none");
                $(".o_tms_card_point").css("display", "none");
            }
            if (viewTypeContent === 'route_point') {
                $(".o_tms_card_point").css("display", "block");
                $(".o_tms_route").css("display", "none");
                $(".o_tms_cards_route_points").css("display", "none");
            }
            if (viewTypeContent === 'cards_route_points') {
                $(".o_tms_route").css("display", "none");
                $(".o_tms_cards_route_points").css("display", "block");
                $(".o_tms_card_point").css("display", "none");
            }
        },

        display_menu: function(viewTypeMenu) {
            if (viewTypeMenu === 'start') {
                $(".o_tms_action_start").css("display", "flex");
                $(".o_tms_route_point_btn").css("display", "none");
                $(".o_tms_btn_point").css("display", "none");
            }
            if (viewTypeMenu === 'cards_route_points') {
                $(".o_tms_action_start").css("display", "none");
                $(".o_tms_route_point_btn").css("display", "block");
                $(".o_tms_btn_point").css("display", "none");
            }
            if (viewTypeMenu === 'route_point') {
                $(".o_tms_btn_point").css("display", "block")
                $(".o_tms_route_point_btn").css("display", "none")
                $(".o_tms_action_start").css("display", "none");
            }
        },

        render_menu: function (viewTypeMenu) {
            if (viewTypeMenu === 'cards_route_points' || 
            this.tmsContext.routePoints.checkAllFinishOrder ||
            this.action.type === 'clear_date_row') {
                this.$(".o_tms_route_point_btn").html(QWeb.render('TmsRoutePointsButtons', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
            if (this.action.type === 'delivered' ||
            this.action.type === 'returned' ||
            this.action.type === 'cancelOrderRow' || Object.keys(this.tmsContext.concretePoint.point).length !== 0) {
                this.$(".o_tms_btn_point").html(QWeb.render('TmsPointButtons', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
                this.display_menu('route_point')
            } else {
                this.$(".o_tms_route_point_btn").html(QWeb.render('TmsRoutePointsButtons', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
                this.display_menu('cards_route_points')
            }
        },

        render_content: function (viewTypeContent) {
            if (viewTypeContent === 'concrete_point') {
                this.$(".o_tms_card_point").html(QWeb.render('TmsPoint', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
            if (viewTypeContent === 'cards_route_points') {
                this.$(".o_tms_cards_route_points").html(QWeb.render('TmsRoutePoints', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
            if (viewTypeContent === 'routes') {
                this.$(".o_tms_route").html(QWeb.render('TmsRoute', {'context': this.tmsContext, 'widget': this.widget, 'action': this.action}));
            }
        },

        tryToAction: function () {

            this.setDateOrderInOrderRow()

            if (!this.tmsContext.routePoints.departedOnRoute) { //Если кнопка в ТЗ уже нажата, но дата начала маршрута ещё не стоит, то проставляем её
                let index_cur_route = this.routes.findIndex(obj => obj.id === parseInt(this.tmsContext.routePoints.routeId))
                this.routes[index_cur_route].departed_on_route = this.action.object.field.tms_date
                this.tmsContext.routePoints.departedOnRoute = this.action.object.field.tms_date;
                this.setRoutesState(this.routes);
                this.saveRoutesInCache(this.routes);
                this.render_menu('cards_route_points')
                this.render_content('routes')
            }

            if (this.action.type === 'departed' || 
            this.action.type === 'finished' ||
            this.action.type === 'returned_store') {
                this.setRoutesState(this.routes);
                this.saveRoutesInCache(this.routes);
                var update_route = true
            }

            if (this.action.typeDate != undefined) {
                this.tmsContext.concretePoint.point[this.action.typeDate] = this.getDateTranformByTz();
            }
            
            this.saveIndexedDbv2(this.action.object.row, this.action.object.field).then(() => {
            if (this.widget.confirmation) {
                this.widget = {}
                this.display_message('confirm')
            }
            if (this.widget.feedBack) {
                this.widget = {}
                this.display_message('feedback')
            }
            this.action = {}
            })
            this.isLastCloseRoutePoint()
            this.render_content('concrete_point')
            this.render_menu()
            this.render_content('cards_route_points')
            if (update_route) {
                this.render_content('routes')
            }
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
            this.tmsContext.routePoints.checkAllFinishOrder = route.points.every(obj => obj.returned_client || obj.delivered || obj.cancel_delivery);

            let points = route ? route.points : [];

            this.setPointsState(points);
            this.isLastCloseRoutePoint()
            this.render_content('cards_route_points')
            this.display_content('cards_route_points')
            this.render_menu('cards_route_points')
            this.display_menu('cards_route_points')
        },

        showConcreteRoutePoint: async function(ev) {

            this.tmsContext.concretePoint.pointId = ev.currentTarget.getAttribute("id");
            this.scrollPos = $(".o_action").scrollTop()

            console.log(this.routes);
            let routePoint = null;
            this.routes.forEach( (route) => {
                var foundPoint = route.points.find((point) => {
                    return point.id === parseInt(this.tmsContext.concretePoint.pointId);
                });
                if (foundPoint) {
                    if(foundPoint.delivered){
                        foundPoint.delivered = this.getDateForValid(foundPoint.delivered, this.tmsContext.attendance.tz_user)
                    }
                    if(foundPoint.returned_client){
                        foundPoint.returned_client = this.getDateForValid(foundPoint.returned_client, this.tmsContext.attendance.tz_user)
                    }
                    if (foundPoint.cancel_delivery){
                        foundPoint.cancel_delivery = this.getDateForValid(foundPoint.cancel_delivery, this.tmsContext.attendance.tz_user)
                    }
                    routePoint = foundPoint;
                    return;
                }
            });

            this.tmsContext.concretePoint.pointOrderName = routePoint.impl_num;
            this.tmsContext.concretePoint.deliveryAddress = routePoint.street;
            this.tmsContext.concretePoint.phone = routePoint.phone;

            await this.setConcretePointState(routePoint);
            this.render_menu('concrete_point')
            this.render_content('concrete_point')
            this.display_menu('route_point')
            this.display_content('route_point')
        },

        initializeIndexedDbv2: function() {
            return new Promise((resolve, reject) => {

                   this.requestDB = indexedDB.open(this.database.idb_name, 5);

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
                   this.setUpdateCacheCron();
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
                    console.log(dataTms)
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

        setSendTmsCronv2: function(){
            setTimeout(() => {
                this.sendSavedRoutesv2()
                this.setSendTmsCronv2();
            }, 12000);
            
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

        setUpdateCacheCron: function() {
            setTimeout(() => {
                 this.updateRoutesCache();
                 this.setUpdateCacheCron();
            },  15 * 60 * 1000);
        },

        updateRoutesCache: async function(){
            await this.putRoutesInCache();
            await this.loadRoutes();
            await this.loadCancellationOrderRow()
            this.render_content('routes')
            console.log('Кеш обновлен');
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
                            this.handleSendRoutes(evlist)
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
                        this.handleSendRoutes(storeName, evlist)
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

        saveBrowseUidUserInCache: function() {
            var transaction = this.database.idb.transaction(this.database.idb_stores.tms_browser_uid, 'readwrite');
            var objectStore = transaction.objectStore(this.database.idb_stores.tms_browser_uid);

            var clearRequest = objectStore.clear();

            clearRequest.onsuccess = function (event) {
                console.log(this.browse)
                var putRequest = objectStore.put(this.browse);
                putRequest.onsuccess = function (event) {
                    console.log('Uid пользователя успешно записан в кеш');
                }.bind(this);

                putRequest.onerror = function (event) {
                    console.error('Ошибка при записи в кеш uid пользователя', event.target.error);
                };
            }.bind(this);

            clearRequest.onerror = function (event) {
                console.error('Ошибка при очистке uid пользователя', event.target.error);
            };
        },

        getDateForValid: function(dateString, tz) {
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                const date = new Date(dateString);
                console.log(dateString, tz)
                return date.toLocaleString("ru-RU", { timeZone: tz });
              }
              return dateString //Если дата в нужном формате, то возращем без преобразования
        },

        getDateForOdoo: function() {
            const currentDate = new Date();
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

        getBrowseUidUserByController: function(cur_browse_uid) {
            console.log("User ID: " + session.uid)
            console.log("UID: " + cur_browse_uid)
            let def = this._rpc({
                model: 'tms.driver.browser',
                method: 'get_unique_key_on_user_id',
                args: [session.uid, cur_browse_uid] //Взятие browse_uid по user_id
            })
                .then((res) => {
                    return res;
                });
            return def;
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

        getCancellationByController: async function() {
            var defCancellation = this._rpc({
                model: 'tms.order.cancellation',
                method: 'getCancellation',
                args: [],
            })
            .then((res) => {
                console.log(res)
                return res
            });
            return await defCancellation
        },

        getRoutesAndPointsByController: function(){
            console.log("User ID: " + session.uid)
            var defRoute = this._rpc({
                model: 'tms.order',
                method: 'getRoutesAndPoints',
                args: [session.uid, this.tmsContext.attendance.tz_user] //Взятие точек и маршрутов по id пользователя и отправка tz
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
                args: [datesTmsOrderRow, session.uid, this.browse.id]
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
                args: [datesTmsOrder, session.uid]
            })
                .then((done) => {
                    return done;
                });
            return def;
        },

        onCancelModalClick(){
            if (this.widget.confirmation) {
                this.widget = {}
                this.display_message('confirm')
            }
            if (this.widget.feedBack) {
                this.widget = {}
                this.display_message('feedback')
            }
            if (this.widget.switchOrder) {
                this.widget = {}
                this.display_message('switchStatusOrder')
            }
            this.action = {}
        },

        async onArrivalButtonClick(){
            this.action.type = 'arrival';
            this.action.typeDate = 'arrival_date'
            //this.tmsContext.concretePoint.point['arrival_date'] = this.getDateForOdoo();
            this.action.object = {
                'row': this.database.idb_stores.tms_order_row,
                'field': {
                    'action': 'arrival',
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'tms_date': this.tmsContext.concretePoint.point['arrival_date'],
                    'sent': false,
                }
            };
            this.showInterfaceActual();
        },

        async onReturnedStoreButtonClick(){
            console.log(this.tmsContext.concretePoint.point);
        },

        async onComplaintButtonClick(){
            console.log(this.tmsContext.concretePoint.point);
        },

        async onReturnedClientButtonClick(){
            this.action.type = 'returned';
            this.action.typeDate = 'returned_client'
            this.widget.confirmation = true

            this.action.object = {
                'row': this.database.idb_stores.tms_order_row,
                'field': {
                    'action': 'returned_client',
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                }};
            this.display_message('confirm')
        },

        async onUpdateCacheClick(){
            await this.putRoutesInCache();
            await this.loadRoutes();
            await this.loadCancellationOrderRow()
        },

        async onShowClosedRowRoute() {
            if (this.tmsContext.filter.showClosedRouteRow) {
                this.tmsContext.filter.showClosedRouteRow = false
            } else {
                this.tmsContext.filter.showClosedRouteRow = true
            }
            this.tmsContext.routePoints.points.sort(function(a, b) {
                if (a.delivered !== false && b.delivered === false) {
                  return -1;
                } else if (a.delivered === false && b.delivered !== false) {
                  return 1;
                } else if (a.returned_store !== false && b.returned_store === false) {
                  return -1;
                } else if (a.returned_store === false && b.returned_store !== false) {
                  return 1;
                } else if (a.returned_client !== false && b.returned_client === false) {
                  return -1;
                } else if (a.returned_client === false && b.returned_client !== false) {
                  return 1;
                } else {
                  return 0;
                }
              });
            this.render_content('cards_route_points')
        },

        async onShowClosedRoute() {
            if (this.tmsContext.filter.showClosedRoute) {
                this.tmsContext.filter.showClosedRoute = false
            } else {
                this.tmsContext.filter.showClosedRoute = true
            }
            this.showInterfaceActual();
        },

        async onDeliveredButtonClick(){
            this.action.type = 'delivered'
            this.action.typeDate = 'delivered'
            this.widget.confirmation = true // Вызов окна потверждения
            this.action.object = {
                'row': this.database.idb_stores.tms_order_row,
                'field': {
                    'action': 'delivered',
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                }
            };

                this.tmsContext.concretePoint.routeDeliverClick = true;
                this.display_message('confirm')
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

        async onPointChangeStatusRow() {
            this.widget.confirmation = true
            this.action.type = 'clear_date_row'
            this.action.object = {
                'row': this.database.idb_stores.tms_order_row,
                'field': {
                    'action': this.action.type,
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'switch_status_row': true,
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                }};
            this.display_message('confirm')
        },

        async onPointCancelRowClick() {
            this.action.type = 'cancelOrderRow';
            this.action.typeDate = 'cancel_delivery'
            this.widget.feedBack = true
            this.display_message('feedback')
        },

        async onPointListButtonClick(){
            this.setConcretePointState({});
            this.display_menu('cards_route_points')
            this.display_content('cards_route_points')
            $(".o_action").scrollTop(this.scrollPos)
        },

        async onUpdateAttendanceStatus(){
                let attendance = await this.getAttendanceByController();
                await this.putRoutesInCache();
                await this.loadRoutes();
                console.log(attendance)
                if (attendance.check_out == false) {
                    this.tmsContext.attendance.check_out = 'check_out';
                    // await this.setAttendanceState({'check_out': 'check_out'});
                } else {
                    await this.setAttendanceState({
                        'check_out': false,
                        'tz_user': this.tmsContext.attendance.tz_user,
                        'hours_today': field_utils.format.float_time(attendance.worked_hours),
                    });
                }
                this.showInterfaceActual();
        },

        async onRouteListClick(){
            this.setPointsState([]);
            console.log(this.routes)
            this.display_menu('start')
            this.display_content('start')
        },

        async onDeparted(){
                this.action.type = 'departed'
                //this.action.typeDate = 'departed'
                this.widget.confirmation = true // Вызов окна потверждения
                this.action.object = {
                    'row': this.database.idb_stores.tms_order,
                    'field': {
                        'action': 'departed',
                        'route_id': this.tmsContext.routePoints.routeId,
                        'tms_date': this.getDateForOdoo(),
                        'sent': false,
                    }};
                this.display_message('confirm')
        },

        getDataForFeedBack() {
            let textArea = document.getElementById('feedback-text');
            let text = textArea.value;
            let select = document.getElementById("selectionList");
            let selectedOption = select.options[select.selectedIndex];
            let optionId = selectedOption.id;
            let commentIs = JSON.parse(selectedOption.value)

            // if (commentIs) { //Если коментарий обязателен
            //     if (text.trim() == '') {
            //         console.log('no')
            //         return false;
            //     }
            // }

            this.action.object = {
                'row': this.database.idb_stores.tms_order_row,
                'field': {
                    'action': 'cancelOrderRow',
                    'point_id': this.tmsContext.concretePoint.point['id'],
                    'driverComment': text,
                    'tagCanceledId': parseInt(optionId),
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                }};
                return true;
        },

        getDateTranformByTz(){
           const currentDate = new Date();
           return currentDate.toLocaleString("ru-RU", {timeZone: this.tmsContext.attendance.tz_user});
        },

        async onFinishedRoute(){
            this.action.type = 'finished'
                //this.action.typeDate = 'departed'
                this.widget.confirmation = true // Вызов окна потверждения
                this.action.object = {
                    'row': this.database.idb_stores.tms_order,
                    'field': {
                        'action': 'finished',
                        'route_id': this.tmsContext.routePoints.routeId,
                        'tms_date': this.getDateForOdoo(),
                        'sent': false,
                    }};
                this.display_message('confirm')
        },

        async onReturnedStore(){
            this.action.type = 'returned_store'
            //this.action.typeDate = 'departed'
            this.widget.confirmation = true // Вызов окна потверждения
            this.action.object = {
                'row': this.database.idb_stores.tms_order,
                'field': {
                    'action': 'returned_store',
                    'route_id': this.tmsContext.routePoints.routeId,
                    'tms_date': this.getDateForOdoo(),
                    'sent': false,
                }};
            this.display_message('confirm')
        },

    });

    var QWeb = core.qweb;

    core.action_registry.add('tms_deliver_mode', TmsDeliverMode);

    return TmsDeliverMode;
});
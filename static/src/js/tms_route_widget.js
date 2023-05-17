/** @odoo-module **/

import {xml, Component} from "@odoo/owl";
import {_lt} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";
import {standardFieldProps} from "@web/views/fields/standard_field_props";
import {useInputField} from "@web/views/fields/input_field_hook";
import { useService } from "@web/core/utils/hooks";
var ajax = require('web.ajax');
var core = require('web.core');
// var Model = require('web.DataModel');

export class TmsWidget extends Component {
    dbName = 'tms_db';
    storeName = 'tms_store1';
    requestDB = null;

    idb = null;
    idb_last_id = -1;
    idb_last_start = undefined;

    now = new Date();


    setup() {
        this.ormService = useService("orm");
        // this.actionService = useService("action");
        this.initializeIndexedDb();
    }

    initializeIndexedDb() {
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
    }

    saveIndexedDb(fieldDb) {
        let tmsStoreObject = this.idb.transaction(this.storeName, "readwrite").objectStore(this.storeName);
        let requestTms = tmsStoreObject.add(fieldDb);
        requestTms.onsuccess = function () {
            console.log("TMS добавлена в хранилище", requestTms.result);
        };

        requestTms.onerror = function () {
            console.log("Ошибка", requestTms.error);
        };
    }

    async sendServer() {
        const done = await this.ormService.call(
            "tms.route",
            "action_arrived",
        )
        if (done) {
            console.log(done);
            this.deleteFieldsInIndexedDb();
        }
    }

    deleteFieldsInIndexedDb(){
        let objectStore = this.idb.transaction(this.storeName, "readwrite").objectStore(this.storeName);
        var clearRequest = objectStore.clear();
        clearRequest.onsuccess = function(event) {
          console.log('Данные успешно удалены из таблицы IndexedDB');
        };
        clearRequest.onerror = function(event) {
          console.error('Ошибка при удалении данных из таблицы IndexedDB', event.target.error);
        };
    }

    onArrivalButtonClick(ev) {
        console.log("Прибыл");
        ev.preventDefault();

        let tmsData = {
            responseServer: {},
            sendServerDate: new Date(),
            timeSendDate: new Date(),
            tmsValue: {'action': 'arrived', 'id': '0'}
        };

        this.saveIndexedDb(tmsData);

        this.checkOnlineStatus()
            .then((message) => {
                console.log(message);
                this.sendServer();
            })
            .catch((error) => {
                console.error(error);
            })
    }


    checkOnlineStatus() {
        return new Promise((resolve, reject) => {
            if (navigator.onLine) {
                resolve("Есть подключение к интернету.");
            } else {
                reject("Нет подключения к интернету.");
            }
        });
    }

    setSendTmsCron() {
        if ((!this.idb_last_start) || (this.now - this.idb_last_start > 30000)) {
            setTimeout(() => {
                this.sendSavedRoutes();
            }, 20000000);
        }
    }

    sendSavedRoutes(){
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

    }

    onNoClaimsButtonClick(ev) {
        console.log("Нет претензий");
    }
}

TmsWidget.template = 'tms.RouteWidget';

core.action_registry.add("tms_route_buttons", TmsWidget);
// registry.category("view_widgets").add("tms_route_buttons", TmsWidget);

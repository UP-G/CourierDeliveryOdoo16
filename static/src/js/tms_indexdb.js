// odoo.define('tms.indexdb', function (require) {
//     "use strict";
//     var ajax = require('web.ajax');
//     var dbName = 'tms_db';
//     var storeName = 'tms_store1';
//
//     var request = window.indexedDB.open(dbName, 4);
//
//     request.onerror = function (event) {
//         console.log('Error opening database');
//     };
//
//     request.onupgradeneeded = function (event) {
//         console.log('NO');
//
//         const db = event.target.result;
//         console.log(db.objectStoreNames.contains(storeName));
//         if (!db.objectStoreNames.contains(storeName)) {
//             var objectStore = db.createObjectStore(storeName, {keyPath: 'id', autoIncrement: true});
//         }
//     };
//
//     request.onsuccess = function (event) {
//         console.log('YES');
//         const db = event.target.result;
//         var tmsStoreObject = db.transaction(storeName, "readwrite").objectStore(storeName);
//         console.log('tmsStoreObject');
//
//         var tmsRoute = {
//             responseServer: {},
//             sendServerFact: new Date(),
//             timeSend: new Date(),
//             tmsData: {
//                 route: 'value1',
//                 contractor: 'value2',
//                 implement_num: 'sdgsdgsd',
//                 transport_company: 'sdgsdg',
//                 arrival_time: new Date(),
//                 arrival_fact: true,
//             }
//         };
//
//         console.log(tmsRoute);
//
//         let requestTms = tmsStoreObject.add(tmsRoute); // (3)
//
//         requestTms.onsuccess = function () { // (4)
//             console.log("TMS добавлена в хранилище", requestTms.result);
//         };
//
//         requestTms.onerror = function () {
//             console.log("Ошибка", requestTms.error);
//         };
//
//
//         // requestShow = tmsStoreObject.getAll();
//         //
//         // requestShow.onsuccess = function () {
//         //     console.log(requestShow.result);
//         // };
//         //
//         // requestShow.onerror = function () {
//         //     console.log("Ошибка", requestShow.error);
//         // };
//     };
//
// });

from odoo import api, fields, models, _

import datetime


class TmsRouteOrderRow(models.Model):
    _name = "tms.route.order.row"
    _description = 'Route Row'

    route_point_id = fields.Many2one('tms.route.point', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='route_point_id')
    route_order_id = fields.Many2one('tms.route.order', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='route_order_id')

    arrival_date = fields.Datetime(string='arrival_time')
    returned_client = fields.Datetime(string='is_returned_client')
    returned_store = fields.Datetime(string='is_returned_store')
    delivered = fields.Datetime(string='delivered')
    complaint = fields.Datetime(string='complaint')

    @api.model
    def action_arrived(self):
        return datetime.datetime.now()

    def show_tms_buttons(self):
        print(self.read())

        return {
            'name': _('TmsOrderButtons'),
            'type': 'ir.actions.client',
            'tag': 'tms_deliver_mode',
            'target': 'main',
            'context': self.read()[0],
        }

    @api.model
    def showPoint(self, pointId):
        query = """SELECT id, arrival_date, returned_client, returned_store, delivered, complaint from tms_route_order_row
                   where route_point_id = %s
                        """

        self.env.cr.execute(query, [pointId])

        return [{'id': id, 'arrival_date': arrival_date,
                 'returned_client': returned_client, 'returned_store': returned_store,
                 'delivered': delivered, 'complaint': complaint} for
                id, arrival_date, returned_client, returned_store, delivered, complaint
                in self.env.cr.fetchall()]


    # @api.model
    # def wasDelivered(self, id):
    #     record = self.env['tms.route.order.row'].search([('id', '=', id)], limit=1)
    #     record.delivered = datetime.datetime.now()
    #     return record.delivered
    #
    # @api.model
    # def wasArrival(self, id):
    #     record = self.env['tms.route.order.row'].search([('id', '=', id)], limit=1)
    #     record.arrival_date = datetime.datetime.now()
    #     return record.arrival_date
    #
    # @api.model
    # def wasReturnedClient(self, id):
    #     record = self.env['tms.route.order.row'].search([('id', '=', id)], limit=1)
    #     record.returned_client = datetime.datetime.now()
    #     return record.returned_client
    #
    # @api.model
    # def wasReturnedStore(self, id):
    #     record = self.env['tms.route.order.row'].search([('id', '=', id)], limit=1)
    #     record.returned_store = datetime.datetime.now()
    #     return record.returned_store

    @api.model
    def sendByIndexedDb(self, dataTms):
        for dataAction in dataTms:
            if dataAction['action'] == 'arrival':
                record = self.env['tms.route.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.arrival_date = dataAction['tms_date']
            elif dataAction['action'] == 'returned_client':
                record = self.env['tms.route.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.returned_client = dataAction['tms_date']
            elif dataAction['action'] == 'delivered':
                record = self.env['tms.route.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.delivered = dataAction['tms_date']
            elif dataAction['action'] == 'complaint':
                pass
            else:
                raise Exception()
        return 'Success'


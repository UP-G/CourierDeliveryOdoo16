from odoo import api, fields, models, _


class TmsDelivery(models.Model):
    _name = "tms.delivery"
    _description = 'Delivery'

    name = fields.Char(string='Name')
    order_num = fields.Char(string='Order Num')
    notes = fields.Char(string='Notes')
    order_date = fields.Char(string='Order Date')
    route_id = fields.Many2one('tms.route', string='Route id')
    # driver_key = fields.Char(string='Driver key')
    # carrier_key = fields.Char(string='Carrier key')
    delivery_row_ids = fields.One2many('tms.delivery.row', 'delivery_id', string='Implemention of Delivery')
    loaded_in_orders = fields.Boolean(string='Load in orders')

    # def add_orders_from_delivery(self):
    #     records = self.env['tms.delivery'].search([('driver_key', '!=', False), ('loaded_in_orders', '=', False)])

    #     for record in records:
    #         driver_id = self.env['tms.carrier.driver'].search([('ref_key', '=', record.driver_key)]).driver_id.id
    #         if record.carrier_key:
    #             carrier_id = self.env['tms.carrier'].search(['ref_key', '=', record.carrier_key]).id
    #         else:
    #             carrier_id = False

    #         order_tms = self.env['tms.order'].create({
    #             'route_id': record.route_id.id,
    #             'order_num': record.order_num,
    #             'order_date': record.order_date,
    #             'notes': record.order_date,
    #             'driver_id': driver_id,
    #             'carrier_id': carrier_id,
    #         })

    #         rows = self.env['tms.delivery.row'].search([('delivery_id', '=', record.id)])

    #         row_ids = []
    #         for row in rows:
    #             tms_order_row = self.env['tms.order.row'].create({
    #                 'order_id': order_tms.id,
    #                 'impl_num': row.impl_num,
    #                 'comment': row.comment,
    #             })

    #             row.order_row_id = tms_order_row.id
    #             row_ids.append(tms_order_row.id)

    #         order_tms.order_row_ids = self.env['tms.order.row'].browse(row_ids)
    #         record.loaded_in_orders = True



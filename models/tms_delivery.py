from odoo import api, fields, models, _


class TmsDelivery(models.Model):
    _name = "tms.delivery"
    _description = 'Delivery'

    name = fields.Char(string='Name')
    order_num = fields.Char(string='Order Num')
    notes = fields.Char(string='Notes')
    order_date = fields.Char(string='Order Date')
    route_id = fields.Many2one('tms.route', string='Route id')
    date_create_1c = fields.Datetime(string='Date create from 1C')
    carrier_driver_id = fields.Many2one('tms.carrier.driver', string='Carrier driver id')

    carrier_id = fields.Many2one('tms.carrier', string="Tms carrier ids")
    delivery_row_ids = fields.One2many('tms.delivery.row', 'delivery_id', string='Implemention of Delivery')
    loaded_in_orders = fields.Boolean(string='Load in orders')

    def add_orders_from_delivery(self):
        records = self.env['tms.delivery'].search([('loaded_in_orders', '=', False)])

        for record in records:
            dublicate_order_number = self.env['tms.order'].search_count([('order_num', '=', record.order_num), ('date_create_1c', '=', record.date_create_1c)])
            
            if(dublicate_order_number != 0):
                record.loaded_in_orders = True
                continue
            order_num = self._get_unique_order_number(record.order_num)


            order_tms = self.env['tms.order'].create({
                'route_id': record.route_id.id,
                'order_num': order_num,
                'order_date': record.order_date,
                'notes': record.order_date,
                'driver_id': record.carrier_driver_id.user_id.id,
                'date_create_1c': record.date_create_1c,
                'carrier_driver_id': record.carrier_driver_id.id,
                'carrier_id': record.carrier_id.id,
            })     

            rows = self.env['tms.delivery.row'].search([('delivery_id', '=', record.id)])

            row_ids = []
            for row in rows:
                tms_order_row = self.env['tms.order.row'].create({
                    'order_id': order_tms.id,
                    'impl_num': row.impl_num,
                    'comment': row.comment,
                })

                row.order_row_id = tms_order_row.id
                row_ids.append(tms_order_row.id)

            order_tms.order_row_ids = self.env['tms.order.row'].browse(row_ids)
            record.loaded_in_orders = True

    def _get_unique_order_number(self, order_num):
        existing_order_numbers = self.env['tms.order'].search_count([('order_num', '=', order_num)])

        if existing_order_numbers == 0:
            return order_num
        else:
            suffix = 1
            while True:
                new_order_number = f"{order_num}_{suffix}"
                existing_order_numbers = self.env['tms.order'].search_count([('order_num', '=', new_order_number)])
                if existing_order_numbers == 0:
                    return new_order_number
                suffix += 1  
    

    def unlink(self):
        self.delivery_row_ids.unlink()
        result = super(TmsDelivery, self).unlink()
from odoo import api, fields, models, _


class TmsDeliveryRow(models.Model):
    _name = "tms.delivery.row"
    _description = 'Delivery row'

    name = fields.Char(string='Name')
    impl_num = fields.Char(string='Implemention Number', required=True) #Номер реализации
    comment = fields.Char(string='Comment', required=True)#Примечание
    client_name = fields.Char(string='Client name') #Имя клиента
    selected = fields.Boolean(string='Selected') #Поле выбрать
    order_row_id = fields.Many2one('tms.order.row', string='Order row id')
    delivery_id = fields.Many2one('tms.delivery', string='Delivery id')
    order_row_type = fields.Selection([('return', 'Return'), ('delivery', ' Delivery')],
                                      string='Type of row')
    notes = fields.Char(string="notes")
    carrier_driver_id = fields.Char(string='Carrier driver id', compute='_compute_driver_id', store=True)

    @api.depends('delivery_id.carrier_driver_id')
    def _compute_driver_id(self):
        for record in self:
            record.carrier_driver_id = record.delivery_id.carrier_driver_id.id

    stock_id = fields.Char(string='Stock id', compute='_compute_stock_id', store=True)

    @api.depends('delivery_id.route_id.stock_id')
    def _compute_stock_id(self):
        for record in self:
            print(record.delivery_id.route_id.stock_id)
            record.stock_id = record.delivery_id.route_id.stock_id.name

    original_id = fields.Integer(string='Original ID', compute='_compute_original_id', readonly=True, copy=False)

    def _compute_original_id(self):
        for record in self:
            record.original_id = record.id

    def action_create_tms_order(self):
        context = dict(self._context or {})
        delivery_row_array = self.env['tms.delivery.row'].browse(context.get('active_ids'))
        record_list = []

        for delivery_row in delivery_row_array:
            print(delivery_row.delivery_id)
            values = {
                'id': delivery_row.id,
                'name': delivery_row.name,
                'impl_num': delivery_row.impl_num,
                'comment': delivery_row.comment,
                'selected': delivery_row.selected,
                'order_row_id': delivery_row.order_row_id.id,
                'delivery_id': delivery_row.delivery_id.id
            }
            record_list.append((1, delivery_row.id, values))

        return {
            'type': 'ir.actions.act_window',
            'name': _('Create Order'),
            'res_model': 'tms.order.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_point_ids': record_list}
        }


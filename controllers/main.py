import json
import logging
import odoo.http as http
from odoo.http import request

_logger = logging.getLogger(__name__)


class TmsController(http.Controller):

    @http.route('/tms/arrival', type='http', auth='public', methods=['POST'])
    def update_route_sheets(self, **kwargs):
        tms_route = http.request.env['tms.route.sheet']

        route_sheets = kwargs['route_sheets']

        for data in route_sheets:
            if 'id' in data:
                pass
                # route_sheet = tms_route.browse(data['id'])
                # if 'arrival_time' in data:
                #     route_sheet.write({'arrival_time': data['arrival_time']})
                # if 'arrival_fact' in data:
                #     route_sheet.write({'arrival_fact': data['arrival_fact']})

        return {'success': True}

    # @http.route('/tms', type="http", auth='public', website=True)
    # def tms_route(self, **kwargs):
    #     return

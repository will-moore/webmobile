#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# Copyright (C) 2012 University of Dundee & Open Microscopy Environment.
# All rights reserved.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
import omeroweb.webclient.decorators

class render_response(omeroweb.webclient.decorators.render_response):
    """ Subclass for adding additional data to the 'context' dict passed to templates """

    def prepare_context(self, request, context, *args, **kwargs):
        """
        This allows templates to access the current eventContext and user from the L{omero.gateway.BlitzGateway}.
        E.g. <h1>{{ ome.user.getFullName }}</h1>
        If these are not required by the template, then they will not need to be loaded by the Blitz Gateway.
        The results are cached by Blitz Gateway, so repeated calls have no additional cost.
        We also process some values from settings and add these to the context.
        """

        super(render_response, self).prepare_context(request, context, *args, **kwargs)
        # we expect @login_required to pass us 'conn', but just in case...
        if 'conn' not in kwargs:
            return
        conn = kwargs['conn']

        # we add the function to the context, so we don't query DB unless we have to
        def active_group():
            group_id = request.session.get('active_group', conn.getEventContext().groupId)
            return conn.getObject("ExperimenterGroup", group_id)
        context['ome']['active_group'] = active_group
        def active_user():
            user_id = request.session.get('user_id', conn.getUserId())
            return conn.getObject("Experimenter", long(user_id))
        context['ome']['active_user'] = active_user
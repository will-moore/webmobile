#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# Copyright (C) <year> University of Dundee & Open Microscopy Environment.
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


# This settings.py file will be imported by omero.settings file AFTER it has initialised custom settings.
from django.conf import settings

# We can directly manipulate the settings - Adding webmobile link to top links
# NB: for some reason we get this imported more than once - make sure we don't duplicate...
if ['Mobile', 'webmobile_index'] not in settings.TOP_LINKS:
    settings.TOP_LINKS.append(['Mobile', 'webmobile_index'])

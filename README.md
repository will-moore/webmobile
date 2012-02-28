OMERO.webmobile
===============
Open Microscopy Environment webmobile OMERO.web extension application.

Requirements
============

* OMERO 4.4.0 or later

Development Installation
========================

Clone the repository in to your OMERO.web installation:

    cd components/tools/OmeroWeb/omeroweb/
    git clone git://github.com/openmicroscopy/webmobile.git
    path/to/bin/omero config set omero.web.apps '["webmobile"]'

Now start up OMERO.web as normal in your development environment.

Production Installation
=======================

Install the latest version of OMERO.server and OMERO.web and then:

    cd $OMERO_HOME/lib/python/omeroweb
    wget -O master.zip https://github.com/openmicroscopy/webmobile/zipball/master
    unzip master.zip
    mv openmicroscopy-webmobile-* webmobile
    path/to/bin/omero config set omero.web.apps '["webmobile"]'

You can then configure OMERO.webmobile as per normal:

* http://trac.openmicroscopy.org/ome/wiki/OmeroWebMobile


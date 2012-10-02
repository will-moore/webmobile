from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response
#from omeroweb.webgateway.views import getBlitzConnection, _session_logout
from omeroweb.webclient.decorators import login_required
from webmobile.decorators import render_response
from omeroweb.webgateway import views as webgateway_views

import settings
import logging
import traceback
import omero
# use the webclient's gateway connection wrapper
from webclient.webclient_gateway import OmeroWebGateway
import webmobile_util

logger = logging.getLogger(__name__)


@login_required()
@render_response()
def choose_group(request, conn=None, **kwargs):
    """ Show a list of all the user's groups - choose one to switch group """
    if conn.isAdmin():  # Admin can see all groups
        groups = [g for g in conn.getObjects("ExperimenterGroup") if g.getName() not in ("system", "user", "guest")]
    else:
        groups = list(conn.getGroupsMemberOf())
    groups.sort(key=lambda x: x.getName().lower())
    return {'template':'webmobile/perms/choose_group.html', 'groups': groups}
    
@login_required()
def switch_group(request, groupId, conn=None, **kwargs):
    """
    Switch to the specified group, then redirect to index. 
    """
    
    from omeroweb.webclient.views import switch_active_group
    switch_active_group(request)
    # switch group - start showing user's own data
    request.session.modified = True
    request.session['user_id'] = conn.getUserId()

    return HttpResponseRedirect(reverse('webmobile_index'))


@login_required()
@render_response()
def choose_user(request, conn=None, **kwargs):
    """ Show a list of all the users in the 'active_group' - choose one to switch group """
    active_group = request.session.get('active_group', conn.getEventContext().groupId)
    group = conn.getObject("ExperimenterGroup", active_group)
    group.groupSummary()    # loads and sorts group.leaders & group.colleagues

    return {'template':'webmobile/perms/choose_user.html', 'group': group}
    
@login_required()
def switch_user(request, userId, conn=None, **kwargs):
    """
    Switch to the specified user, then redirect to index. 
    """

    request.session.modified = True
    request.session['user_id'] = userId

    return HttpResponseRedirect(reverse('webmobile_index'))


@login_required()
def viewer(request, imageId, conn=None, **kwargs):

    image = conn.getObject("Image", imageId)
    w = image.getSizeX()
    h = image.getSizeY()
    
    return render_to_response('webmobile/viewers/viewer_iphone.html', {'image':image})
    

@login_required()
def viewer_big(request, imageId, conn=None, **kwargs):

    image = conn.getImage(imageId)
    w = image.getWidth() 
    h = image.getHeight() 
    z = image.z_count() /2
    
    return render_to_response('webmobile/viewers/big_iphone.html', {'image':image, 'w':w, 'h': h, 'z':z})
    
    
@login_required(setGroupContext=True)
@render_response()
def projects (request, eid=None, conn=None, **kwargs):
    """ List the projects owned by the current user, or another user specified by eId """
    
    eid = request.session.get('user_id', conn.getUserId())
        
    projs = conn.listProjects(eid=eid)
    projs = list(projs)
    
    if request.REQUEST.get('sort', None) == 'recent':
        projs.sort(key=lambda x: x.creationEventDate())
        projs.reverse()
    else:
        projs.sort(key=lambda x: x.getName().lower())
    ods = conn.listOrphans("Dataset", eid=eid)
    orphanedDatasets = list(ods)
    
    return { 'template':'webmobile/browse/projects.html', 'projects':projs, 'datasets':orphanedDatasets }


@login_required()
@render_response()
def project(request, id, conn=None, **kwargs):
    """ Show datasets belonging to the specified project """
    
    prj = conn.getObject("Project", id)
    return {'template':'webmobile/browse/project.html', 'project':prj}


@login_required()
@render_response()
def object_details(request, obj_type, id, conn=None, **kwargs):
    """ Show project/dataset details: Name, description, owner, annotations etc """

    if obj_type == 'project':
        obj = conn.getObject("Project", id)
        title = 'Project'
    elif obj_type == 'dataset':
        obj = conn.getObject("Dataset", id)
        title = 'Dataset'
    anns = getAnnotations(obj)
    
    parent = obj.getParent()
    
    return {'template':'webmobile/browse/object_details.html', 'object': obj, 'title': title, 
        'annotations':anns, 'obj_type': obj_type}


@login_required()
@render_response()
def dataset(request, id, conn=None, **kwargs):
    """ Show images in the specified dataset """

    ds = conn.getObject("Dataset", id)
    return {'template': 'webmobile/browse/dataset.html', 'dataset': ds}
    
        
@login_required()
@render_response()
def image(request, imageId, conn=None, **kwargs):
    """ Show image summary: Name, dimensions, large thumbnail, description, annotations """

    img = conn.getObject("Image", imageId)
    anns = getAnnotations(img)
    
    return {'template': 'webmobile/browse/image.html', 'object':img, 'obj_type':'image',
        'annotations': anns}
    
@login_required()
def orphaned_images(request, eid, conn=None, **kwargs):
    """ Show image summary: Name, dimensions, large thumbnail, description, annotations """

    orphans = conn.listOrphans("Image", eid=eid)
    return render_to_response('webmobile/browse/orphaned_images.html', {'client': conn, 'orphans':orphans})


@login_required()
def screens(request, eid=None, conn=None, **kwargs):
    """  """
    experimenter = None
    if eid is not None:
        experimenter = conn.getObject("Experimenter", eid)
    else:
        # show current user's screens by default
        eid = conn.getEventContext().userId
        
    scrs = conn.listScreens(eid=eid)
    
    if request.REQUEST.get('sort', None) == 'recent':
        scrs = list(scrs)
        scrs.sort(key=lambda x: x.creationEventDate())
        scrs.reverse()
        
    ops = conn.listOrphans("Plate", eid=eid)
    orphanedPlates = list(ops)
    
    return render_to_response('webmobile/browse/screens.html', 
        {'client':conn, 'screens':scrs, 'orphans':orphanedPlates, 'experimenter':experimenter })
 

@login_required()
def screen(request, id, conn=None, **kwargs):
    """ Show plates in the specified scren """

    scrn = conn.getObject("Screen", id)
    return render_to_response('webmobile/browse/screen.html', {'client': conn, 'screen': scrn})   


@login_required()
def plate(request, id, conn=None, **kwargs):
    """ Show plate - grid of thumbs? """
    
    scrn = conn.getObject("Screen", id)
    return render_to_response('webmobile/browse/screen.html', {'client': conn, 'screen': scrn})


def getAnnotations(obj):
    """ List the annotations and sort into comments, tags, ratings, files etc """
    
    comments = list()
    ratings = list()
    files = list()
    tags = list()
    
    from omero.model import CommentAnnotationI, LongAnnotationI, TagAnnotationI, FileAnnotationI
                            
    for ann in obj.listAnnotations():
        if isinstance(ann._obj, CommentAnnotationI):
            comments.append(ann)
        elif isinstance(ann._obj, LongAnnotationI):
            ratings.append(ann)
        elif isinstance(ann._obj, FileAnnotationI):
            files.append(ann)
        elif isinstance(ann._obj, TagAnnotationI):
            tags.append(ann)
            
    comments.sort(key=lambda x: x.creationEventDate())
    comments.reverse()
    
    return {"comments":comments, "ratings":ratings, "files":files, "tags":tags}


@login_required()
def edit_object(request, obj_type, obj_id, conn=None, **kwargs):
    """
    Display a page for editing Name and Description of Project/Dataset/Image etc
    Page 'submit' redirects here with 'name' and 'description' in POST, which 
    will do the edit and return to the object_details page. 
    """
    if obj_type == 'image': 
        obj = conn.getObject("Image", obj_id)
        title = 'Image'
        redirect = reverse('webmobile_image', kwargs={'imageId':obj_id})
    elif obj_type == 'dataset':
        obj = conn.getObject("Dataset", obj_id)
        title = 'Dataset'
        redirect = reverse('webmobile_dataset_details', kwargs={'id':obj_id})
    elif obj_type == 'project':
        obj = conn.getObject("Project", obj_id)
        title = 'Project'
        redirect = reverse('webmobile_project_details', kwargs={'id':obj_id})
        
    # if name, description in request, edit and redirect to object_details
    name = request.REQUEST.get('name', None)
    if name:
        obj.setName(name)
        description = request.REQUEST.get('description', '').strip()
        if len(description) == 0:
            description = None
        obj.setDescription(description)
        obj.save()
        return HttpResponseRedirect(redirect)
    
    return render_to_response('webmobile/browse/edit_object.html', {'client': conn, 'title':title, 'object':obj})
    

@login_required()
def add_comment(request, obj_type, obj_id, conn=None, **kwargs):
    """
    Adds a comment (from request 'comment') to object 'project', 'dataset', 'image' then 
    redirects to the 'details' page for that object: E.g. project_details page etc. 
    """
    from omero.rtypes import rstring
    
    redirect = reverse('webmobile_index')   # default
    if obj_type == 'image': 
        l = omero.model.ImageAnnotationLinkI()
        parent = omero.model.ImageI(obj_id, False)     # use unloaded object to avoid update conflicts
        redirect = reverse('webmobile_image', kwargs={'imageId':obj_id})
    elif obj_type == 'dataset':
        l = omero.model.DatasetAnnotationLinkI()
        parent = omero.model.DatasetI(obj_id, False)
        redirect = reverse('webmobile_dataset_details', kwargs={'id':obj_id})
    elif obj_type == 'project':
        l = omero.model.ProjectAnnotationLinkI()
        parent = omero.model.ProjectI(obj_id, False)
        redirect = reverse('webmobile_project_details', kwargs={'id':obj_id})
    
    comment = request.REQUEST.get('comment', None)
    if comment is None or (len(comment.strip()) == 0):
        return HttpResponseRedirect(redirect)
        
    updateService = conn.getUpdateService()
    ann = omero.model.CommentAnnotationI()
    comment = unicode(comment).encode("utf-8").strip()
    ann.setTextValue(rstring(comment))
    ann = updateService.saveAndReturnObject(ann)
    l.setParent(parent)
    l.setChild(ann)
    updateService.saveObject(l)
    
    return HttpResponseRedirect(redirect)


def logout (request):
    try:
        conn.seppuku()
    except:
        logger.error('Exception during logout.', exc_info=True)
    finally:
        request.session.flush()
    return HttpResponseRedirect(reverse("webmobile_index"))

@login_required()
@render_response()
def index (request, eid=None, conn=None, **kwargs):

    experimenter = None
    if eid is not None:
        experimenter = conn.getObject("Experimenter", eid)
      
    return {'client': conn, 'experimenter': experimenter, 'template':'webmobile/index.html'}


@login_required()
def recent (request, obj_type, eid=None, conn=None, **kwargs):
    
    experimenter = None
    if eid:
        experimenter = conn.getObject("Experimenter", eid)
        
    # By default, get 3 each of Projects, Datasets, Images, Ratings, Comments, Tags
    obj_count = 3   
    obj_types = None
    if obj_type == 'images':    # Get the last 12 images
        obj_types = ['Image']
        obj_count = 12
    elif obj_type == 'anns':    # 4 each of Tags, Comments, Rating
        obj_types = ['Annotation']
        obj_count = 4
    
    if obj_type == 'rois':
        recentResults = webmobile_util.listRois(conn, eid)
    else:
        recentItems = webmobile_util.listMostRecentObjects(conn, obj_count, obj_types, eid)
        recentResults = [ webmobile_util.RecentEvent(r) for r in recentItems ]
    
    # list members for links to other's recent activity
    groupId = conn.getEventContext().groupId
    members = conn.containedExperimenters(groupId)
        
    return render_to_response('webmobile/timeline/recent.html', {'client':conn, 'recent':recentResults, 
        'exp':experimenter, 'members':members, 'obj_type':str(obj_type) })

@login_required()
def recent_full_page (request, conn=None, **kwargs):
    """
    Mock-up full page for Usability testing of recent views. 
    """
    exp = conn.getObject("Experimenter", conn.getEventContext().userId)
        
    return render_to_response('webmobile/timeline/recent_full_page.html', {'client':conn, 'exp':exp })
    
    

@login_required()
def collab_annotations (request, myData=True, conn=None, **kwargs):
    """
    Page displays recent annotations of OTHER users on MY data (myData=True) or
    MY annotations on data belonging to OTHER users. 
    """
    collabAnns = webmobile_util.listCollabAnnotations(conn, myData)
    
    return render_to_response('webmobile/timeline/recent_collab.html', {'client':conn, 'recent':collabAnns, 'myData':myData })
    

@login_required()
def image_viewer (request, iid, conn=None, **kwargs):
    """ This view is responsible for showing pixel data as images """

    kwargs['viewport_server'] = '/webclient'
    
    return webgateway_views.full_viewer(request, iid, _conn=conn, **kwargs)

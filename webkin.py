import bpy
import numpy as np
import mathutils
import math
import os



def to_world(points, world_matrix) :
    """Applies the world_matrix to a set of local points. Not thoroughly tested, 
    use with caution, kept it here for potential future use. """
    
    # Decompose world_matrix into a rotation+scale matrix and a location vector
    world_mat = np.asarray(world_matrix)
    mat = world_mat[:3, :3]
    loc = world_mat[:3, 3]

    # Apply rotation matrix, then translate by location
    global_points = points @ mat.T + loc

    return global_points


def to_local(points, world_matrix) :
    """Applies world matrix backwards to world points to get them back to local space.
    
    - points : np.array of shape (N,3), N being the number of points
    - world_matrix : mathutils.Matrix outputted by obj.data.matrix_world
    
    Returns : np.array of shape (N,3) of local points"""

    # Decompose world_matrix into a rotation+scale matrix and a location vector
    world_mat = np.asarray(world_matrix)
    mat = world_mat[:3, :3]
    loc = world_mat[:3, 3]

    # Calculate actual inverse matrix instead of transpose in case 
    # of there being shear and mat not being a rotation matrix stricto sensu
    inv_mat = np.linalg.inv(mat.T)

    # Translate back, then apply inverse matrix
    local_points = (points - loc) @ inv_mat

    return local_points

def get_node_group(nodes, name) : 
    for n in nodes : 
        if type(n).__name__ == "ShaderNodeGroup" : 
            if n.node_tree.name == name : 
                return n

def toggle_shadowcast(obj, status) :
    if len(obj.material_slots) == 0 : 
        print("Toggle shadowcast : skipping %s" % obj.name)
        return
    
    material = obj.material_slots[0].material
    node_tree = material.node_tree
    node_group = get_node_group(node_tree.nodes, "ShadowCast")
    assert node_group is not None, "Shadowcast shader node group wasn't found for %s" % obj.name
    node_group.inputs["Active"].default_value = 1.0 if status else 0.0

def get_mesh_objects(col_name) : 
    col = bpy.data.collections[col_name]
    return [o for o in col.all_objects if type(o.data).__name__ == "Mesh"]

def isolate(obj, col_name) : 
    for o in get_mesh_objects(col_name) : 
        shadow_only = obj.name != o.name
        toggle_shadowcast(o, shadow_only)

def disable_shadowcast(col_name) :
    for o in get_mesh_objects(col_name) : 
        toggle_shadowcast(o, False)


class LayoutElement : 

    def __init__(self, data, layout):
        self.name = data["name"]
        self.data = data
        self.layout = layout
    
    def get(self, key) :
        if key in self.data.keys() : 
            return self.data[key]
    
    #@ get_px_position
    def get_px_position(self, origin=None) :
        if origin is None : 
            origin = [0.0,0.0]
        
        pos = self.get_position(mode="TOPLEFT")

        pos = [
            pos[0]-origin[0],
            pos[1]-origin[1],
        ]

        # sign of y needs to be inverted due to 
        # html position being from top downwards

        return [
            -self.pixels(pos[0]),
            -self.pixels(pos[1]),
        ]
    
    def get_px_depth(self) : 
        depth_array = np.array([e.get_depth() for e in self.layout.elements()])
        min_depth = np.min(depth_array)
        return self.pixels(self.get("depth")-min_depth)

    def get_position(self, mode="CENTER") :
        pos = self.get("position")
        
        if mode == "TOPLEFT" :
            size = self.get_size()
            pos = [
                pos[0]+size[0]/2,
                pos[1]+size[1]/2,
            ]

        return pos
    
    def get_depth(self) :
        return self.get("depth")

    def get_ortho_scale(self) :
        return self.get('ortho_scale')
    
    def get_size(self) : 
        return self.get("size")
    
    def get_resolution(self) : 
        size = self.get_size()
        return [
            self.pixels(size[0]),
            self.pixels(size[1]),
        ]

    def __repr__(self):
        return str(self.data)
    
    def pixels(self, value) : 
        return self.layout.pixels(value)
    
    #@ get_html
    def get_html(self, asset_location="Render") :
        origin = self.layout.get_origin()
        px_pos = self.get_px_position(origin)
        name = self.name
        px_depth = self.get_px_depth()
        res = self.get_resolution()
        
        template = '<img src="%s/%s.png" width="%d" height="%s" style="z-index: %d; left: %dpx; top: %dpx;">' 
        return template % (asset_location, name, res[0], res[1], px_depth, px_pos[0], px_pos[1])


class LayoutInfos : 

    def __init__(self, data):
        self.target_px_width = 500
        self.width = None
        self.elements_list = []
        for d in data : 
            self.elements_list.append(LayoutElement(d, self))

    def elements(self) -> list[LayoutElement] :
        return self.elements_list
    
    def set_target_px_width(self, target_width) : 
        self.target_px_width = target_width
    
    def get_element(self, name) : 
        for el in self.elements() : 
            if el.name == name : 
                return el

    def get_width(self) : 
        if self.width is None :
            sizes = np.array([e.get_size() for e in self.elements()])
            self.width = np.max(sizes[:,0])
        return self.width
    
    def pixels(self, value) :
        ppm = self.target_px_width / self.get_width()
        return int(value * ppm)
    
    #@ get_origin
    def get_origin(self) :
        print('Origin calculation, base positions : ', {e.name : e.get_position("TOPLEFT") for e in self.elements()})
        pos = np.array([e.get_position("TOPLEFT") for e in self.elements()])
        return [np.max(pos[:,0]), np.max(pos[:,1])]
         


def get_layout_infos(objects) :
    data = []
    cam_depth = bpy.data.objects["Camera"].location.x

    for obj in objects :  
        coords = np.array([v.co for v in obj.data.vertices])
        coords = to_world(coords, obj.matrix_world)
        # print("Coords : ", coords)

        min_x = np.min(coords[:,0])
        max_x = np.max(coords[:,0])
        min_y = np.min(coords[:,2])
        max_y = np.max(coords[:,2])

        depth = np.mean(coords[:,1])

        pos = [np.mean([max_x, min_x]), np.mean([max_y, min_y])]
        x_size = max_x-min_x
        y_size = max_y-min_y
        
        size = [x_size, y_size]

        print(x_size, y_size)
        ortho = np.max([x_size, y_size])

        values = {
            "size" : size,
            "position" : pos,
            "ortho_scale" : ortho,
            "depth" : depth,
            "cam_depth" : cam_depth,
            "name" : obj.name,
            "object" : obj
        }

        data.append(values)

    return LayoutInfos(data)


def create_cam(location, ortho_scale) : 
    camera_data = bpy.data.cameras.new(name="TMP_CAM")
    camera_object = bpy.data.objects.new("TMP_CAM", camera_data)

    bpy.context.scene.collection.objects.link(camera_object)
    bpy.context.scene.camera = camera_object

    camera_object.location = (location[0], 15, location[1])
    camera_object.rotation_euler = [math.pi/2, 0, math.pi]

    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = ortho_scale

    return camera_object

def export_object(layout_element:LayoutElement, path, col_name, skip_render=False) : 
    scene = bpy.context.scene
    obj = layout_element.get("object")
    print("Exporting %s to %s" % (obj.name, path))

    pos = layout_element.get_position()
    resolution = layout_element.get_resolution()
    ortho_scale = layout_element.get_ortho_scale()

    print("Resolution : ", resolution)

    old_res = [scene.render.resolution_x, scene.render.resolution_y]
    old_cam = scene.camera

    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True

    new_cam = create_cam(pos, ortho_scale)

    isolate(obj, col_name)

    bpy.context.scene.render.filepath = os.path.join(path, obj.name+".png")
    bpy.context.scene.render.image_settings.file_format = 'PNG'

    if not skip_render :
        bpy.ops.render.render(write_still=True)

    scene.camera = old_cam
    scene.render.resolution_x = old_res[0]
    scene.render.resolution_y = old_res[1]

    bpy.data.objects.remove(new_cam)

    disable_shadowcast(col_name)

def export_html(layout_infos : LayoutInfos, template_path, output_path, assets_location) : 

    html_elements = [e.get_html(assets_location) for e in layout_infos.elements()]
    print(html_elements)

    with open(template_path, 'r') as infile : 
        template = infile.read()

    placeholder = "<!-- ELEMENTS  -->"
    element_block = "".join(["\n            "+txt for txt in html_elements])
    template = template.replace(placeholder, element_block)

    with open(output_path, 'w') as outfile : 
        outfile.write(template)

name = "Chapter1_v05"
path = "D:\Documents\Scripts\WebKin\Chapter1_assets"
collection_name = "Diorama"

objects = get_mesh_objects(collection_name)
layout_infos = get_layout_infos(objects)
layout_infos.set_target_px_width(600)


# for element in layout_infos.elements() : 
#     print("%s : " % element.name, element.get("size"))
#     print("- position : ", element.get("pos"))
#     print("- size : ", element.get("size"))
#     print()
    
cloud2 = layout_infos.get_element("Cloud2")
pos = cloud2.get_position("TOPLEFT")
print("Cloud2 position : ", pos)
bpy.context.scene.cursor.location = [pos[0], cloud2.get_depth(), pos[1]]


#@ base
origin = layout_infos.get_origin()
print("Origin : ", origin)
pos = origin
bpy.context.scene.cursor.location = [pos[0], -2.2, pos[1]]

for element in layout_infos.elements() : 
    export_object(element, path, collection_name, skip_render=False)

# export_html(layout_infos, "template.html", "%s.html"%name, "%s_assets" % name)



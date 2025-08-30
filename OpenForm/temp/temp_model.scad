// Cup parameters
cup_height = 100; // Height of the cup
cup_diameter_top = 80; // Diameter of the top of the cup
cup_diameter_bottom = 60; // Diameter of the bottom of the cup
wall_thickness = 2; // Thickness of the cup wall
fillet_radius = 5; // Radius for the fillet at the bottom inside edge

// Difference between top and bottom radius
radius_diff = (cup_diameter_top - cup_diameter_bottom) / 2;

// Outer cup
module outer_cup() {
    hull() {
        translate([0,0,0])
        circle(d=cup_diameter_bottom);
        
        translate([0,0,cup_height])
        circle(d=cup_diameter_top);
    }
}

// Inner cup (hollowed out)
module inner_cup() {
    hull() {
        translate([0,0,0])
        circle(d=cup_diameter_bottom - 2*wall_thickness);
        
        translate([0,0,cup_height - wall_thickness]) //reduce height of inner so top edge has thickness
        circle(d=cup_diameter_top - 2*wall_thickness);
    }
}

// Fillet module - Create a torus to cut away for the fillet
module bottom_fillet() {
    translate([0,0,wall_thickness])
    rotate([90,0,0])
    difference(){
        cylinder(h=wall_thickness, d=cup_diameter_bottom - (2*wall_thickness));

        translate([0,0,-fillet_radius])
        rotate([0,0,0])
        rotate_extrude(angle = 360)
            translate([((cup_diameter_bottom - (2*wall_thickness))/2) - fillet_radius,0,0])
                circle(r = fillet_radius);
    }

}

difference() {
    outer_cup();
    inner_cup();
   
    bottom_fillet();

}
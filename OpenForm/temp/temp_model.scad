// Chair model

// Parameters
chair_width = 40;  // Width of the chair
chair_depth = 40;  // Depth of the chair
chair_height = 80; // Height of the chair
seat_height = 45;  // Height of the seat
leg_thickness = 5; // Thickness of the legs
back_height = 35;  // Height of the backrest
back_thickness = 3; // Thickness of the backrest

// Module for a single leg
module leg() {
    cube([leg_thickness, leg_thickness, seat_height]);
}

// Module for the seat
module seat() {
    difference() {
        cube([chair_width, chair_depth, leg_thickness]);
        translate([leg_thickness, leg_thickness, -0.1])
        cube([chair_width-2*leg_thickness, chair_depth-2*leg_thickness, leg_thickness+0.2]);
    }
}

// Module for the backrest
module backrest() {
    translate([0, chair_depth - back_thickness, seat_height])
    cube([chair_width, back_thickness, back_height]);
}

// Main chair module
module chair() {
    // Legs
    translate([0, 0, 0]) leg();
    translate([chair_width - leg_thickness, 0, 0]) leg();
    translate([0, chair_depth - leg_thickness, 0]) leg();
    translate([chair_width - leg_thickness, chair_depth - leg_thickness, 0]) leg();

    // Seat
    translate([0, 0, seat_height - leg_thickness]) seat();

    // Backrest
    backrest();
}

// Render the chair
chair();
import { DriveInfo } from "@/engine";
import { Activity, AirVent, Album, Anchor, Apple, Atom, Badge, Barcode, Blend, Bolt, Book, Box, Boxes, BrickWall, Briefcase, BriefcaseBusiness, BringToFront, Cloud, Cloudy, Contrast, Cuboid, Cylinder, Database, Flower, GalleryVerticalEnd, Gem, Volleyball } from "lucide-react";

export function DriveIcon({ driveInfo, className }: { driveInfo: DriveInfo, className?: string }) {
    const icons = [ GalleryVerticalEnd, Contrast, Database, Volleyball, Activity, Anchor, Apple, Atom, Blend, Box, Bolt, BrickWall, Briefcase, BriefcaseBusiness, BringToFront, Album, AirVent, Flower, Gem, Badge, Barcode, Book, Boxes, Cloud, Cloudy, Cuboid,Cylinder];
    const hash = hashToInts(driveInfo.id, icons.length);
    const IconComponent = icons[hash];
    return <IconComponent className={className} />;
}

function hashToInts(str: string, variants: number) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % variants);
}

/**
 * The mosaic of the media section: the pictures of a day in rows of one height each, as wide as the window, every picture in its own
 * proportions (so the tiles are of different sizes), a heading above each day. Pure functions, so that the arithmetic is tested; the page only
 * draws what these say. Only the blocks that are on the screen are drawn: a drive may hold tens of thousands of photos.
 */

export interface LayoutItem {
    id: string;
    /** Width divided by height of the picture. */
    aspect: number;
    takenAt: number;
}

export interface Section {
    key: string;
    label: string;
    items: LayoutItem[];
}

export interface Tile {
    id: string;
    left: number;
    width: number;
    height: number;
}

export interface RowBlock {
    type: "row";
    sectionKey: string;
    top: number;
    height: number;
    tiles: Tile[];
}

export interface HeaderBlock {
    type: "header";
    sectionKey: string;
    top: number;
    height: number;
    label: string;
    count: number;
}

export type Block = RowBlock | HeaderBlock;

export interface Layout {
    blocks: Block[];
    height: number;
}

export interface LayoutOptions {
    /** The width of the area. */
    width: number;
    /** The height a row is aimed at; rows come out a little lower or higher so that they fill the width. */
    targetHeight: number;
    gap: number;
    headerHeight: number;
    /** Space under the last row of a day. */
    sectionGap: number;
}

/** A panorama or a tall strip would take a whole row alone or shrink it to nothing: their proportions are limited for the layout (the tile crops a little). */
export const MIN_ASPECT = 0.45;
export const MAX_ASPECT = 3;

export function clampAspect(aspect: number): number {
    if (!Number.isFinite(aspect) || aspect <= 0) return 4 / 3;
    return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day (in the viewer's time zone) a moment falls on: "2024-03-09". */
export function dayKey(moment: number): string {
    const date = new Date(moment);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAY_DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "long" });
const WEEKDAY_DAY_YEAR = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

/** "Today", "Yesterday", "Sat, 9 March" and, for another year, "Sat, 9 March 2024". */
export function dayLabel(moment: number, now: number = Date.now()): string {
    const today = dayKey(now);
    const key = dayKey(moment);
    if (key === today) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === dayKey(yesterday.getTime())) return "Yesterday";
    const date = new Date(moment);
    return (date.getFullYear() === new Date(now).getFullYear() ? WEEKDAY_DAY : WEEKDAY_DAY_YEAR).format(date);
}

/** How the pictures are cut into sections: by day, by month, or "auto": the last two weeks by day and what is older by month. */
export type GroupBy = "auto" | "day" | "month";

/** In "auto", pictures newer than this many days are cut by day. */
export const AUTO_DAYS = 14;

/** The calendar month a moment falls on: "2024-03". */
export function monthKey(moment: number): string {
    const date = new Date(moment);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** "March 2024"; for this year only "March". */
export function monthLabel(moment: number, now: number = Date.now()): string {
    const date = new Date(moment);
    return (date.getFullYear() === new Date(now).getFullYear() ? MONTH : MONTH_YEAR).format(date);
}

function byDay(moment: number, mode: GroupBy, now: number): boolean {
    return mode === "day" || (mode === "auto" && now - moment < AUTO_DAYS * 86_400_000);
}

/** Cuts a list that is already sorted (the newest first) into sections, as `mode` says. */
export function buildSections(items: LayoutItem[], now: number = Date.now(), mode: GroupBy = "day"): Section[] {
    const sections: Section[] = [];
    for (const item of items) {
        const daily = byDay(item.takenAt, mode, now);
        const key = daily ? dayKey(item.takenAt) : monthKey(item.takenAt);
        const last = sections[sections.length - 1];
        if (last && last.key === key) last.items.push(item);
        else sections.push({ key, label: daily ? dayLabel(item.takenAt, now) : monthLabel(item.takenAt, now), items: [item] });
    }
    return sections;
}

/** The rows of one section: pictures are added to a row until it would be lower than the target, then the row is closed with or without the last picture, whichever is nearer the target. */
export function justifyRows(items: LayoutItem[], width: number, targetHeight: number, gap: number): Array<{ items: LayoutItem[]; height: number; full: boolean }> {
    const rows: Array<{ items: LayoutItem[]; height: number; full: boolean }> = [];
    const heightOf = (count: number, aspects: number) => (width - gap * (count - 1)) / aspects;
    let row: LayoutItem[] = [];
    let aspects = 0;
    for (const item of items) {
        const aspect = clampAspect(item.aspect);
        row.push(item);
        aspects += aspect;
        const height = heightOf(row.length, aspects);
        if (height > targetHeight) continue;
        if (row.length > 1) {
            const withoutLast = heightOf(row.length - 1, aspects - aspect);
            if (Math.abs(withoutLast - targetHeight) < Math.abs(height - targetHeight)) {
                rows.push({ items: row.slice(0, -1), height: withoutLast, full: true });
                row = [item];
                aspects = aspect;
                continue;
            }
        }
        rows.push({ items: row, height, full: true });
        row = [];
        aspects = 0;
    }
    if (row.length > 0) {
        // what is left does not fill a row: it keeps the target height (or less where it would not fit) and is not stretched
        rows.push({ items: row, height: Math.min(targetHeight, heightOf(row.length, aspects)), full: false });
    }
    return rows;
}

function tilesOf(row: { items: LayoutItem[]; height: number; full: boolean }, width: number, gap: number): Tile[] {
    const height = Math.round(row.height);
    const tiles: Tile[] = [];
    let left = 0;
    row.items.forEach((item, index) => {
        const last = index === row.items.length - 1;
        // the widths are whole pixels; in a row that fills the width the last picture takes what is left, so that the edges are straight
        const wanted = Math.round(clampAspect(item.aspect) * row.height);
        const tileWidth = last && row.full ? Math.max(1, width - left) : Math.max(1, wanted);
        tiles.push({ id: item.id, left, width: tileWidth, height });
        left += tileWidth + gap;
    });
    return tiles;
}

export function layoutSections(sections: Section[], options: LayoutOptions): Layout {
    const { width, targetHeight, gap, headerHeight, sectionGap } = options;
    const blocks: Block[] = [];
    let top = 0;
    if (!(width > 0)) return { blocks, height: 0 };
    for (const section of sections) {
        blocks.push({ type: "header", sectionKey: section.key, top, height: headerHeight, label: section.label, count: section.items.length });
        top += headerHeight;
        for (const row of justifyRows(section.items, width, targetHeight, gap)) {
            const tiles = tilesOf(row, width, gap);
            const height = tiles[0]?.height ?? 0;
            blocks.push({ type: "row", sectionKey: section.key, top, height, tiles });
            top += height + gap;
        }
        top += sectionGap - gap;
    }
    return { blocks, height: Math.max(0, top) };
}

/** The blocks that touch the window [from, to] (the first block that ends below `from` up to the last that starts above `to`). */
export function blocksInView(layout: Layout, from: number, to: number): Block[] {
    const { blocks } = layout;
    let low = 0;
    let high = blocks.length;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (blocks[middle].top + blocks[middle].height < from) low = middle + 1;
        else high = middle;
    }
    const visible: Block[] = [];
    for (let i = low; i < blocks.length && blocks[i].top <= to; i++) visible.push(blocks[i]);
    return visible;
}

export const TILE_SIZES = { small: 150, medium: 220, large: 320 } as const;
export type TileSize = keyof typeof TILE_SIZES;

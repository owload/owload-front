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
    /** Distance from the top of its block; rows put every tile at the top, the mosaic lets a tile start lower. */
    top?: number;
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

/** "mosaic": a grid in which a picture takes one cell, two side by side, two one over the other or four; "rows": rows of one height, every picture in its own proportions. */
export type LayoutMode = "mosaic" | "rows";

export interface LayoutOptions {
    /** The width of the area. */
    width: number;
    /** The height a row is aimed at (rows come out a little lower or higher so that they fill the width), or the size of one cell of the mosaic. */
    targetHeight: number;
    mode?: LayoutMode;
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

// ---------------------------------------------------------------------------------------------------------------------
// the mosaic

export interface PlacedTile {
    id: string;
    row: number;
    column: number;
    columns: number;
    rows: number;
}

/** A number in [0, 1) that is the same for the same text: what makes a picture big or small is its name, so the mosaic does not change on every draw. */
export function unitHash(text: string): number {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 2246822507);
    hash ^= hash >>> 13;
    return (hash >>> 0) / 4294967296;
}

/** How many cells wide the grid is: as many as the target size allows, at least two. */
export function mosaicColumns(width: number, cellTarget: number, gap: number): number {
    return Math.max(2, Math.round((width + gap) / (cellTarget + gap)));
}

/** What decides the sizes of a section: how often a picture is large or wide, whether the section opens with a large one, whether its end is kept tidy. */
interface Variant {
    salt: string;
    big: number;
    wide: number;
    firstBigFrom: number;
    tidyEnd: boolean;
}

const STANDARD: Variant = { salt: "", big: 0.08, wide: 0.3, firstBigFrom: 6, tidyEnd: true };

/** What size a picture would like to be: mostly one cell, some twice as wide (or as tall, for a portrait), a few four times the area. */
function wantedSpan(item: LayoutItem, first: boolean, count: number, columns: number, bigAllowed: boolean, variant: Variant): [number, number] {
    const u = unitHash(item.id + variant.salt);
    const tall = item.aspect < 0.85;
    if (first && count >= variant.firstBigFrom && columns >= 3) return [2, 2]; // a section opens with a large picture
    if (u < variant.big && columns >= 3 && bigAllowed) return [2, 2];
    if (u < variant.wide) return tall ? [1, 2] : [2, 1];
    return [1, 1];
}

function packWith(items: LayoutItem[], columns: number, variant: Variant): { tiles: PlacedTile[]; rows: number } {
    const occupied: boolean[][] = [];
    const cell = (row: number, column: number) => occupied[row]?.[column] === true;
    const take = (row: number, column: number) => { (occupied[row] ??= [])[column] = true; };
    const tiles: PlacedTile[] = [];
    let row = 0;
    let column = 0;
    let lastBig = -100;
    items.forEach((item, index) => {
        while (cell(row, column)) {
            column++;
            if (column >= columns) { column = 0; row++; }
        }
        let freeWide = 0;
        while (column + freeWide < columns && !cell(row, column + freeWide)) freeWide++;
        let [wantWide, wantTall] = wantedSpan(item, index === 0, items.length, columns, index - lastBig >= 5, variant); // large ones are not side by side
        // the last pictures are not tall, so that the section does not end in a notch: only its last row may be short
        if (variant.tidyEnd && items.length - index <= columns) { if (wantWide === 2 && wantTall === 2) wantWide = 1; wantTall = 1; if (wantWide === 2 && items.length - index === 1) wantWide = 1; }
        let wide = Math.min(wantWide, freeWide);
        if (wantWide === 2 && wantTall === 2) wantTall = wide; // a large picture that has room for one column only stays square
        let tall = 1;
        while (tall < wantTall) {
            let free = true;
            for (let c = column; c < column + wide; c++) if (cell(row + tall, c)) free = false;
            if (!free) break;
            tall++;
        }
        if (wide === 2 && wantTall === 2 && tall < 2) wide = 1; // ... and one that has no room below stays square too
        if (wide === 2 && tall === 2) lastBig = index;
        for (let r = row; r < row + tall; r++) for (let c = column; c < column + wide; c++) take(r, c);
        tiles.push({ id: item.id, row, column, columns: wide, rows: tall });
    });
    return { tiles, rows: occupied.length };
}

/** A section this small is laid out several ways and the liveliest one without gaps is kept; a larger one is long enough to be varied with the standard rules. */
const TRIED_UP_TO = 60;
const TRIED_VARIANTS = 48;

/** Lower is better: an empty cell at the end costs most, a variety of sizes and a large picture earn. */
function score(tiles: PlacedTile[], rows: number, columns: number): number {
    let covered = 0;
    const shapes = new Set<string>();
    for (const tile of tiles) { covered += tile.columns * tile.rows; shapes.add(`${tile.columns}x${tile.rows}`); }
    const empty = rows * columns - covered;
    return empty * 18 - shapes.size * 10 - (shapes.has("2x2") ? 15 : 0);
}

/**
 * Puts the pictures of a section on a grid, in order, each in the first free place and as large as it would like to be but no larger than
 * that place allows, so no hole is left inside (only the last row may be short). A short section is laid out in several ways, so that
 * even a few pictures of one size make a mosaic and not a row of equal squares.
 */
export function packMosaic(items: LayoutItem[], columns: number): { tiles: PlacedTile[]; rows: number } {
    if (items.length > TRIED_UP_TO || items.length < 2 || columns < 3) return packWith(items, columns, STANDARD);
    let best = packWith(items, columns, STANDARD);
    let bestScore = score(best.tiles, best.rows, columns);
    for (let i = 0; i < TRIED_VARIANTS; i++) {
        const variant: Variant = {
            salt: `#${i}`,
            big: [0.1, 0.2, 0.3][i % 3],
            wide: [0.45, 0.6][i % 2] + 0.1 * (i % 3 === 0 ? 1 : 0),
            firstBigFrom: i % 4 < 2 ? 3 : 100,
            tidyEnd: i % 4 !== 1,
        };
        const candidate = packWith(items, columns, variant);
        const candidateScore = score(candidate.tiles, candidate.rows, columns);
        if (candidateScore < bestScore) { best = candidate; bestScore = candidateScore; }
    }
    return best;
}

/** Grid rows that make one block, so that only the blocks on the screen are drawn. */
const BAND_ROWS = 3;

function mosaicBlocks(section: Section, options: LayoutOptions, top: number): { blocks: RowBlock[]; height: number } {
    const { width, targetHeight, gap } = options;
    const columns = mosaicColumns(width, targetHeight, gap);
    const cell = (width - gap * (columns - 1)) / columns;
    const { tiles, rows } = packMosaic(section.items, columns);
    const rowTop = (r: number) => Math.round(r * (cell + gap));
    const blocks: RowBlock[] = [];
    for (let first = 0; first < rows; first += BAND_ROWS) {
        const last = Math.min(rows, first + BAND_ROWS);
        const bandTop = rowTop(first);
        const placed = tiles
            .filter((t) => t.row >= first && t.row < last)
            .map((t): Tile => {
                const left = Math.round(t.column * (cell + gap));
                const right = t.column + t.columns >= columns ? width : Math.round((t.column + t.columns) * (cell + gap) - gap);
                return { id: t.id, left, width: right - left, top: rowTop(t.row) - bandTop, height: Math.round(t.rows * cell + (t.rows - 1) * gap) };
            });
        blocks.push({ type: "row", sectionKey: section.key, top: top + bandTop, height: rowTop(last) - bandTop - gap, tiles: placed });
    }
    return { blocks, height: rows === 0 ? 0 : rowTop(rows) - gap };
}

export function layoutSections(sections: Section[], options: LayoutOptions): Layout {
    const { width, targetHeight, gap, headerHeight, sectionGap } = options;
    const blocks: Block[] = [];
    let top = 0;
    if (!(width > 0)) return { blocks, height: 0 };
    for (const section of sections) {
        blocks.push({ type: "header", sectionKey: section.key, top, height: headerHeight, label: section.label, count: section.items.length });
        top += headerHeight;
        if (options.mode === "mosaic") {
            const mosaic = mosaicBlocks(section, options, top);
            blocks.push(...mosaic.blocks);
            top += mosaic.height + sectionGap;
            continue;
        }
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

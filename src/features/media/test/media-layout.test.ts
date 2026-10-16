import { describe, expect, it } from "vitest";
import { blocksInView, buildSections, clampAspect, dayKey, dayLabel, justifyRows, layoutSections, MAX_ASPECT, MIN_ASPECT, mosaicColumns, packMosaic, unitHash, type LayoutItem } from "../media-layout";

const item = (id: string, aspect: number, takenAt = Date.UTC(2024, 2, 9, 12)): LayoutItem => ({ id, aspect, takenAt });
const options = { width: 1000, targetHeight: 200, gap: 4, headerHeight: 44, sectionGap: 16 };

describe("clampAspect", () => {
    it("limits panoramas and strips, and replaces what is not a proportion by 4:3", () => {
        expect(clampAspect(10)).toBe(MAX_ASPECT);
        expect(clampAspect(0.1)).toBe(MIN_ASPECT);
        expect(clampAspect(1.5)).toBe(1.5);
        for (const bad of [0, -1, NaN, Infinity]) expect(clampAspect(bad)).toBe(4 / 3);
    });
});

describe("justifyRows", () => {
    it("fills the width exactly in every full row, whatever the proportions", () => {
        const items = Array.from({ length: 23 }, (_, i) => item(`p${i}`, [1.5, 0.75, 1.33, 1, 1.78, 0.56][i % 6]));
        const rows = justifyRows(items, 1000, 200, 4);
        for (const row of rows.filter((r) => r.full)) {
            const aspects = row.items.reduce((sum, i) => sum + clampAspect(i.aspect), 0);
            expect(row.height * aspects + 4 * (row.items.length - 1)).toBeCloseTo(1000, 6);
        }
        expect(rows.flatMap((r) => r.items.map((i) => i.id))).toEqual(items.map((i) => i.id)); // none lost, the order kept
    });

    it("keeps the rows close to the target height", () => {
        const items = Array.from({ length: 40 }, (_, i) => item(`p${i}`, [1.5, 0.75, 1.33, 1][i % 4]));
        for (const row of justifyRows(items, 1000, 200, 4).filter((r) => r.full)) {
            expect(row.height).toBeGreaterThan(200 * 0.55);
            expect(row.height).toBeLessThan(200 * 1.6);
        }
    });

    it("does not stretch the last row: it keeps the target height", () => {
        const rows = justifyRows([item("a", 1.5), item("b", 1.5)], 1000, 200, 4);
        expect(rows).toHaveLength(1);
        expect(rows[0].full).toBe(false);
        expect(rows[0].height).toBe(200);
    });

    it("lets a lone wide picture be as high as the width allows, no more than the target", () => {
        const rows = justifyRows([item("a", 3)], 300, 200, 4);
        expect(rows[0].height).toBe(100); // 300 wide at 3:1
    });

    it("gives no rows for no pictures", () => {
        expect(justifyRows([], 1000, 200, 4)).toEqual([]);
    });
});

describe("layoutSections", () => {
    const sections = buildSections([item("a", 1.5, Date.UTC(2024, 2, 9, 12)), item("b", 1, Date.UTC(2024, 2, 9, 10)), item("c", 0.75, Date.UTC(2023, 5, 1, 12))], Date.UTC(2024, 5, 1));

    it("puts a heading above the rows of each day, one under the other with no overlap", () => {
        const layout = layoutSections(sections, options);
        expect(layout.blocks.map((b) => b.type)).toEqual(["header", "row", "header", "row"]);
        for (let i = 1; i < layout.blocks.length; i++) {
            expect(layout.blocks[i].top).toBeGreaterThanOrEqual(layout.blocks[i - 1].top + layout.blocks[i - 1].height);
        }
        expect(layout.height).toBeGreaterThan(layout.blocks[layout.blocks.length - 1].top);
    });

    it("gives whole-pixel tiles that stay inside the width, with straight edges in a full row", () => {
        const items = Array.from({ length: 30 }, (_, i) => item(`p${i}`, [1.5, 0.75, 1.33, 1][i % 4]));
        const layout = layoutSections(buildSections(items), options);
        for (const block of layout.blocks) {
            if (block.type !== "row") continue;
            for (const tile of block.tiles) {
                expect(Number.isInteger(tile.left) && Number.isInteger(tile.width) && Number.isInteger(tile.height)).toBe(true);
                expect(tile.left + tile.width).toBeLessThanOrEqual(1000);
            }
        }
        const fullRows = layout.blocks.filter((b): b is Extract<typeof b, { type: "row" }> => b.type === "row").slice(0, -1);
        for (const row of fullRows) {
            const last = row.tiles[row.tiles.length - 1];
            expect(last.left + last.width).toBe(1000);
        }
    });

    it("is empty for no width or no pictures", () => {
        expect(layoutSections(sections, { ...options, width: 0 })).toEqual({ blocks: [], height: 0 });
        expect(layoutSections([], options)).toEqual({ blocks: [], height: 0 });
    });
});

describe("blocksInView", () => {
    const items = Array.from({ length: 200 }, (_, i) => item(`p${i}`, 1.5, Date.UTC(2024, 2, 9, 12) - i * 3_600_000));
    const layout = layoutSections(buildSections(items), options);

    it("gives only the blocks that touch the window, in order", () => {
        const visible = blocksInView(layout, 1000, 1800);
        expect(visible.length).toBeGreaterThan(0);
        expect(visible.length).toBeLessThan(layout.blocks.length / 3);
        for (const block of visible) {
            expect(block.top + block.height).toBeGreaterThanOrEqual(1000);
            expect(block.top).toBeLessThanOrEqual(1800);
        }
        for (let i = 1; i < visible.length; i++) expect(visible[i].top).toBeGreaterThan(visible[i - 1].top);
    });

    it("gives the start of the list for a window at the top and nothing for one past the end", () => {
        expect(blocksInView(layout, 0, 100)[0]).toBe(layout.blocks[0]);
        expect(blocksInView(layout, layout.height + 1000, layout.height + 2000)).toEqual([]);
    });
});

describe("days", () => {
    const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

    it("names a day by its date in the viewer's zone", () => {
        expect(dayKey(noon(2024, 3, 9))).toBe("2024-03-09");
    });

    it("says Today and Yesterday, and gives the year only for another year", () => {
        const now = noon(2024, 6, 15);
        expect(dayLabel(noon(2024, 6, 15), now)).toBe("Today");
        expect(dayLabel(noon(2024, 6, 14), now)).toBe("Yesterday");
        expect(dayLabel(noon(2024, 3, 9), now)).toBe("Sat, March 9");
        expect(dayLabel(noon(2023, 3, 9), now)).toBe("Thu, March 9, 2023");
    });

    it("cuts a sorted list into days", () => {
        const sections = buildSections([item("a", 1, noon(2024, 3, 9)), item("b", 1, noon(2024, 3, 9) - 3600_000), item("c", 1, noon(2024, 3, 8))], noon(2024, 6, 1));
        expect(sections.map((s) => [s.key, s.items.map((i) => i.id)])).toEqual([["2024-03-09", ["a", "b"]], ["2024-03-08", ["c"]]]);
    });
});

describe("grouping modes", () => {
    const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
    const now = noon(2024, 6, 15);
    const items = [
        item("a", 1, noon(2024, 6, 14)), item("b", 1, noon(2024, 6, 3)), item("c", 1, noon(2024, 6, 2)),
        item("d", 1, noon(2024, 5, 20)), item("e", 1, noon(2024, 5, 1)), item("f", 1, noon(2023, 12, 25)),
    ];

    it("cuts by day when asked to, whatever the age", () => {
        expect(buildSections(items, now, "day").map((s) => s.key)).toEqual(["2024-06-14", "2024-06-03", "2024-06-02", "2024-05-20", "2024-05-01", "2023-12-25"]);
    });

    it("cuts by month when asked to, naming the year only when it is not this one", () => {
        const sections = buildSections(items, now, "month");
        expect(sections.map((s) => [s.label, s.items.length])).toEqual([["June", 3], ["May", 2], ["December 2023", 1]]);
    });

    it("in auto, the last two weeks go by day and what is older by month", () => {
        const recent = [item("a", 1, noon(2024, 6, 14)), item("b", 1, noon(2024, 6, 10)), item("c", 1, noon(2024, 5, 20)), item("d", 1, noon(2024, 5, 2)), item("e", 1, noon(2023, 12, 25))];
        const sections = buildSections(recent, now, "auto");
        expect(sections.map((s) => s.key)).toEqual(["2024-06-14", "2024-06-10", "2024-05", "2023-12"]);
        expect(sections.map((s) => s.items.length)).toEqual([1, 1, 2, 1]);
        expect(sections[2].label).toBe("May");
    });

    it("tells a month by its number, so that two Mays of different years are two sections", () => {
        const sections = buildSections([item("a", 1, noon(2024, 5, 3)), item("b", 1, noon(2023, 5, 3))], now, "month");
        expect(sections.map((s) => s.key)).toEqual(["2024-05", "2023-05"]);
    });
});

describe("the mosaic", () => {
    const same = (n: number, aspect = 4 / 3): LayoutItem[] => Array.from({ length: n }, (_, i) => item(`photo-${i}`, aspect, Date.UTC(2024, 2, 9, 12) - i * 60_000));
    const cellsOf = (tiles: ReturnType<typeof packMosaic>["tiles"]) => tiles.flatMap((t) => Array.from({ length: t.columns * t.rows }, (_, i) => `${t.row + Math.floor(i / t.columns)}:${t.column + (i % t.columns)}`));

    it("gives the same number back for the same name, and different ones for different names", () => {
        expect(unitHash("a")).toBe(unitHash("a"));
        expect(unitHash("a")).not.toBe(unitHash("b"));
        for (const name of ["", "a", "photo-1", "é"]) expect(unitHash(name)).toBeGreaterThanOrEqual(0);
    });

    it("takes as many columns as the cell size allows, at least two", () => {
        expect(mosaicColumns(1000, 220, 4)).toBe(4);
        expect(mosaicColumns(1000, 150, 4)).toBe(7);
        expect(mosaicColumns(300, 400, 4)).toBe(2);
    });

    it("places every picture once, on no cell twice, inside the columns", () => {
        const { tiles } = packMosaic(same(80), 5);
        expect(tiles.map((t) => t.id)).toEqual(same(80).map((i) => i.id));
        const cells = cellsOf(tiles);
        expect(new Set(cells).size).toBe(cells.length);
        for (const t of tiles) expect(t.column + t.columns).toBeLessThanOrEqual(5);
    });

    it("leaves no hole inside: every cell above the last row is taken", () => {
        for (const columns of [2, 3, 4, 6, 8]) {
            const { tiles, rows } = packMosaic(same(120), columns);
            const taken = new Set(cellsOf(tiles));
            for (let r = 0; r < rows - 1; r++) for (let c = 0; c < columns; c++) expect(taken.has(`${r}:${c}`)).toBe(true);
        }
    });

    it("makes a mosaic even of pictures of one size: tiles of several sizes, and a large one to open a section", () => {
        const { tiles } = packMosaic(same(80), 5);
        const sizes = new Set(tiles.map((t) => `${t.columns}x${t.rows}`));
        expect(sizes.size).toBeGreaterThanOrEqual(3);
        expect(tiles[0]).toMatchObject({ columns: 2, rows: 2 });
        const mostly = tiles.filter((t) => t.columns === 1 && t.rows === 1).length;
        expect(mostly).toBeGreaterThan(tiles.length / 2); // most are small: a mosaic, not a wall of big ones
    });

    it("makes a portrait tall and a landscape wide when it wants more than one cell", () => {
        const portraits = packMosaic(same(100, 0.6).slice(1), 5).tiles.filter((t) => t.columns * t.rows === 2);
        expect(portraits.every((t) => t.rows === 2)).toBe(true);
        const landscapes = packMosaic(same(100, 1.5).slice(1), 5).tiles.filter((t) => t.columns * t.rows === 2);
        expect(landscapes.every((t) => t.columns === 2)).toBe(true);
    });

    it("does not put large tiles one after another", () => {
        const { tiles } = packMosaic(same(200), 6);
        const bigAt = tiles.map((t, i) => (t.columns === 2 && t.rows === 2 ? i : -1)).filter((i) => i >= 0);
        expect(bigAt.length).toBeGreaterThan(3);
        for (let i = 1; i < bigAt.length; i++) expect(bigAt[i] - bigAt[i - 1]).toBeGreaterThanOrEqual(5);
    });

    it("is the same every time, and does not use large tiles on a grid of two columns", () => {
        expect(packMosaic(same(30), 4)).toEqual(packMosaic(same(30), 4));
        for (const t of packMosaic(same(30), 2).tiles) expect(t.columns * t.rows).toBeLessThanOrEqual(2);
    });

    it("is empty for no pictures, and one cell for one", () => {
        expect(packMosaic([], 4)).toEqual({ tiles: [], rows: 0 });
        expect(packMosaic(same(1), 4).tiles).toHaveLength(1);
    });

    it("makes even a short section of equal pictures a mosaic, without overlaps or holes inside", () => {
        for (const columns of [3, 5, 7]) {
            for (let count = 3; count <= 9; count++) {
                const { tiles, rows } = packMosaic(same(count), columns);
                const cells = cellsOf(tiles);
                expect(new Set(cells).size).toBe(cells.length);
                expect(new Set(tiles.map((t) => `${t.columns}x${t.rows}`)).size).toBeGreaterThan(1);
                // every row above the last is full
                for (let r = 0; r < rows - 1; r++) for (let c = 0; c < columns; c++) expect(cells).toContain(`${r}:${c}`);
            }
        }
    });

    it("lays out into blocks that fill the width with straight edges and do not overlap", () => {
        const layout = layoutSections(buildSections(same(100)), { ...options, mode: "mosaic" });
        const rows = layout.blocks.filter((b): b is Extract<typeof b, { type: "row" }> => b.type === "row");
        expect(rows.length).toBeGreaterThan(3);
        const boxes: Array<[number, number, number, number]> = [];
        for (const block of rows) {
            for (const tile of block.tiles) {
                expect(tile.left).toBeGreaterThanOrEqual(0);
                expect(tile.left + tile.width).toBeLessThanOrEqual(1000);
                expect(tile.width).toBeGreaterThan(0);
                expect(tile.height).toBeGreaterThan(0);
                boxes.push([tile.left, block.top + (tile.top ?? 0), tile.left + tile.width, block.top + (tile.top ?? 0) + tile.height]);
            }
        }
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                const [a, b] = [boxes[i], boxes[j]];
                const overlap = a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
                expect(overlap).toBe(false);
            }
        }
        expect(layout.height).toBeGreaterThan(rows[rows.length - 1].top);
        for (const block of layout.blocks) expect(block.top + block.height).toBeLessThanOrEqual(layout.height);
    });

    it("works for a very narrow area", () => {
        const layout = layoutSections(buildSections(same(10)), { ...options, width: 120, mode: "mosaic" });
        for (const block of layout.blocks) if (block.type === "row") for (const t of block.tiles) expect(t.left + t.width).toBeLessThanOrEqual(120);
    });
});

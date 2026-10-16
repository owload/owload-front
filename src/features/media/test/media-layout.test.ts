import { describe, expect, it } from "vitest";
import { blocksInView, buildSections, clampAspect, dayKey, dayLabel, justifyRows, layoutSections, MAX_ASPECT, MIN_ASPECT, type LayoutItem } from "../media-layout";

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

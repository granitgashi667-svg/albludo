export const COLORS = {
    RED: 0xE53935,
    GREEN: 0x43A047,
    YELLOW: 0xFDD835,
    BLUE: 0x1E88E5,
    WHITE: 0xFFFFFF,
    CREAM: 0xF5F5DC,
    BOARD_BROWN: 0x8B4513
};

export const PLAYER_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
export const PLAYER_COLORS = [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];

export const CELL = 1.2;
export const BOARD_SIZE = 15;

export const PATH_COORDS = [
    {c:1,r:6},{c:2,r:6},{c:3,r:6},{c:4,r:6},{c:5,r:6},
    {c:6,r:5},{c:6,r:4},{c:6,r:3},{c:6,r:2},{c:6,r:1},{c:6,r:0},
    {c:7,r:0},{c:8,r:0},{c:8,r:1},{c:8,r:2},{c:8,r:3},{c:8,r:4},{c:8,r:5},
    {c:9,r:6},{c:10,r:6},{c:11,r:6},{c:12,r:6},{c:13,r:6},{c:14,r:6},
    {c:14,r:7},{c:14,r:8},{c:13,r:8},{c:12,r:8},{c:11,r:8},{c:10,r:8},{c:9,r:8},
    {c:8,r:9},{c:8,r:10},{c:8,r:11},{c:8,r:12},{c:8,r:13},{c:8,r:14},
    {c:7,r:14},{c:6,r:14},{c:6,r:13},{c:6,r:12},{c:6,r:11},{c:6,r:10},{c:6,r:9},
    {c:5,r:8},{c:4,r:8},{c:3,r:8},{c:2,r:8},{c:1,r:8},{c:0,r:8},{c:0,r:7}
];

export const SAFE_SQUARES = [0,8,13,21,26,34,39,47];

export const HOME_COLUMNS = {
    RED: [{c:1,r:7},{c:2,r:7},{c:3,r:7},{c:4,r:7},{c:5,r:7},{c:6,r:7}],
    GREEN: [{c:7,r:1},{c:7,r:2},{c:7,r:3},{c:7,r:4},{c:7,r:5},{c:7,r:6}],
    YELLOW: [{c:13,r:7},{c:12,r:7},{c:11,r:7},{c:10,r:7},{c:9,r:7},{c:8,r:7}],
    BLUE: [{c:7,r:13},{c:7,r:12},{c:7,r:11},{c:7,r:10},{c:7,r:9},{c:7,r:8}]
};

export const START_POSITIONS = { RED:0, GREEN:13, YELLOW:26, BLUE:39 };

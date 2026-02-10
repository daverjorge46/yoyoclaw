# Interview Coding Challenge: CSV Processor

## Challenge Description

This is a coding challenge submission that processes advertising rotation data from CSV files and calculates Cost Per View (CPV) metrics.

## Problem Statement

Given two CSV files:
- `rotations.csv` - Contains rotation schedules with start/end times
- `spots.csv` - Contains ad spot data with creative IDs, spend, views, dates, and times

Calculate:
1. **Creative CPV**: Cost per view for each creative
2. **Rotation CPV**: Cost per view for each rotation on each date

## Input Format

### rotations.csv
```
Name,Start,End
Morning,6:00 AM,12:00 PM
Afternoon,12:00 PM,6:00 PM
Evening,6:00 PM,12:00 AM
```

### spots.csv
```
Creative,Spend,Views,Date,Time
Creative_A,100,50,2024-01-01,10:00 AM
Creative_B,200,100,2024-01-01,2:00 PM
```

## Output Format

The program outputs two arrays:
1. Creative CPV array with `{creative, CPV}` objects
2. Rotation CPV array with `{date, rotation, CPV}` objects

## Usage

```bash
node csv-processor.js
```

## Notes

This submission was provided as-is from a coding interview. The code works but may have areas for improvement in terms of:
- Error handling
- Code style and conventions
- Performance optimization
- Modern JavaScript features
- TypeScript conversion

## Sample Output

```
creative CPV [
  { creative: 'Creative_A', CPV: 2 },
  { creative: 'Creative_B', CPV: 2 }
]
rotatin CPV [
  { date: '2024-01-01', rotation: 'Morning', CPV: 2 },
  { date: '2024-01-01', rotation: 'Afternoon', CPV: 2 }
]
```

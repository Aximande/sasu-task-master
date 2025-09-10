# Claude Code Development Notes

## Important: MUI Grid Issues

### Problem
The MUI Grid component causes TypeScript compilation errors in this project. The Grid API has compatibility issues with the current MUI version (v7).

### Solution
**DO NOT USE Grid component from @mui/material**

Instead, use Box with flexbox styles:

```tsx
// ❌ DON'T DO THIS
import { Grid } from '@mui/material';

<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    Content
  </Grid>
</Grid>

// ✅ DO THIS INSTEAD
import { Box } from '@mui/material';

<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
    Content
  </Box>
</Box>
```

### Common Patterns

#### Full-width container with spacing:
```tsx
<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
```

#### Responsive columns:
```tsx
// 100% on mobile, 50% on desktop
<Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>

// 100% on mobile, 30% on desktop (sidebar)
<Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 30%' } }}>

// 100% on mobile, 65% on desktop (main content)
<Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 65%' } }}>
```

#### Column layout:
```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
```

## Date Configuration

The application is configured to use September 10, 2025 as the current date to match the data in our Google Sheets.

## Tax Rates (2025)

The tax calculation page uses 2025 French tax rates:
- Corporate Tax (IS): 15% up to 42,500€, then 25%
- Income Tax (IR): Progressive brackets from 0% to 45%
- Social charges on salary: ~42% employer + ~22% employee
- Flat tax on dividends (PFU): 30% (17.2% social + 12.8% income tax)
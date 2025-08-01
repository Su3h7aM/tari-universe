import i18n from 'i18next';

export enum FormatPreset {
    PERCENT = 'percent',
    XTM_DECIMALS = 'xtm-decimals',
    XTM_COMPACT = 'xtm-compact',
    XTM_LONG = 'xtm-crypto',
    XTM_LONG_DEC = 'xtm-long',
    DECIMAL_COMPACT = 'decimal-compact',
    COMPACT = 'compact',
}

const removeDecimals = (value: number, decimals: number) => {
    return value / Math.pow(10, decimals);
};

const removeXTMCryptoDecimals = (value: number) => {
    return removeDecimals(value, 6);
};

/**
    ## Workaround for forced rounding up by Intl.NumberFormat
    ** 1234 => 0
    ** 1234567 => 1230000
    ** 123456789 => 123450000
    ** 12345678987654 => 12345678980000
*/
const roundToTwoDecimals = (val: number, decimals = 6) => {
    if (decimals <= 2) return val;
    return val - (val % Math.pow(10, decimals - 2));
};

/**
    ## Workaround for forced rounding up by Intl.NumberFormat
    ** 1234 => 0
    ** 1234567 => 1230000
    ** 123456789 => 123450000
    ** 12345678987654 => 12340000000000
*/
const roundCompactDecimals = (value: number, decimals = 6) => {
    if (value < Math.pow(10, decimals - 2)) return 0;
    if (value < Math.pow(10, decimals)) return roundToTwoDecimals(value, decimals);

    let unitIndex = 0;
    let formattedValue = value;
    while (formattedValue >= 1000) {
        formattedValue /= 1000;
        unitIndex++;
    }
    formattedValue = Math.floor(formattedValue * 100) / 100;
    return formattedValue * Math.pow(1000, unitIndex);
};

const formatValue = (value: number, options: Intl.NumberFormatOptions = {}): string =>
    Intl.NumberFormat(i18n.language, options).format(value);

const formatPercent = (value = 0) => formatValue(value, { style: 'percent', maximumFractionDigits: 2 });

const formatXTMDecimals = (value: number) =>
    formatValue(removeXTMCryptoDecimals(value), {
        style: 'decimal',
        minimumFractionDigits: 6,
    });

const formatXTMCompact = (value: number) =>
    formatValue(removeXTMCryptoDecimals(roundCompactDecimals(value)), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        notation: 'compact',
        style: 'decimal',
    });

const formatXTMLong = (value: number) =>
    formatValue(removeXTMCryptoDecimals(roundToTwoDecimals(value)), {
        maximumFractionDigits: 2,
        notation: 'standard',
        style: 'decimal',
    });

const formatXTMLongDec = (value: number, maxFractionDigits = 4) =>
    formatValue(removeXTMCryptoDecimals(value), {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxFractionDigits,
        notation: 'standard',
        style: 'decimal',
    });

const formatDecimalCompact = (value: number) => formatValue(value, { maximumFractionDigits: 2, style: 'decimal' });

export function formatNumber(value: number, preset: FormatPreset): string {
    switch (preset) {
        case FormatPreset.COMPACT:
            if (value < 10000) {
                return formatDecimalCompact(value);
            }
            return formatValue(roundCompactDecimals(value), {
                maximumFractionDigits: 2,
                notation: 'compact',
                style: 'decimal',
            });
        case FormatPreset.PERCENT:
            return formatPercent(value);
        case FormatPreset.XTM_COMPACT:
            if (value / 1_000_000 < 0.01 && value > 0) {
                return `< 0.01`;
            }
            return formatXTMCompact(value);
        case FormatPreset.XTM_LONG:
            return formatXTMLong(value);
        case FormatPreset.XTM_LONG_DEC: {
            return formatXTMLongDec(value);
        }
        case FormatPreset.XTM_DECIMALS:
            return formatXTMDecimals(value);
        case FormatPreset.DECIMAL_COMPACT:
            return formatDecimalCompact(value);
        default:
            console.error('Unknown format preset:', preset);
            return '-';
    }
}

interface Hashrate {
    value: number;
    unit: string;
}

export function formatHashrate(hashrate: number, joinUnit = true): Hashrate {
    if (hashrate < 1000) {
        return {
            value: hashrate,
            unit: 'H/s',
        };
    }
    if (hashrate < 1000000) {
        return {
            value: Number((hashrate / 1000).toFixed(2)),
            unit: joinUnit ? ' kH/s' : 'k',
        };
    }
    if (hashrate < 1000000000) {
        return {
            value: Number((hashrate / 1000000).toFixed(2)),
            unit: joinUnit ? ' MH/s' : 'M',
        };
    }
    if (hashrate < 1000000000000) {
        return {
            value: Number((hashrate / 1000000000).toFixed(2)),
            unit: joinUnit ? ' GH/s' : 'G',
        };
    }
    if (hashrate < 1000000000000000) {
        return {
            value: Number((hashrate / 1000000000000).toFixed(2)),
            unit: joinUnit ? ' TH/s' : 'T',
        };
    } else {
        return {
            value: Number((hashrate / 1000000000000000).toFixed(2)),
            unit: joinUnit ? ' PH/s' : 'P',
        };
    }
}

export const formatCountdown = (targetDate: string): string => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
        return '0D 0H 0M';
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}D ${hours}H ${minutes}M`;
};

export { formatDecimalCompact, roundToTwoDecimals, removeDecimals, removeXTMCryptoDecimals, formatValue };

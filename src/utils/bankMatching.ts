// Fuzzy matching function to find closest bank name
export const findClosestBankMatch = (clientBankName: string, availableBanks: string[]): string | null => {
    if (availableBanks.length === 0) return null;

    // Common bank name mappings
    const bankNameMappings: { [key: string]: string } = {
        'induslnd': 'indusind',
        'indusland': 'indusind',
        'axis': 'axis bank',
        'kotak': 'kotak mahindra bank',
        'kotak mahindra': 'kotak mahindra bank',
        'aditya birla': 'aditya birla capital',
        'poonawalla': 'poonawalla fincorp',
        'hdfc': 'hdfc bank',
        'sbi': 'state bank of india',
        'icici': 'icici bank',
        'pnb': 'punjab national bank',
        'canara': 'canara bank',
        'union': 'union bank of india',
        'bank of baroda': 'bob',
        'bob': 'bank of baroda',
        'idbi': 'idbi bank',
        'yes': 'yes bank',
        'federal': 'federal bank',
        'karur': 'karur vysya bank',
        'karnataka': 'karnataka bank',
        'south indian': 'south indian bank',
        'tamilnad': 'tamilnad mercantile bank',
        'tmb': 'tamilnad mercantile bank',
        'uco': 'uco bank',
        'central': 'central bank of india',
        'indian': 'indian bank',
        'indian overseas': 'indian overseas bank',
        'iob': 'indian overseas bank',
        'punjab and sind': 'punjab and sind bank',
        'psb': 'punjab and sind bank',
        'bank of india': 'boi',
        'boi': 'bank of india',
        'bank of maharashtra': 'bom',
        'bom': 'bank of maharashtra',
        'indifi': 'indifi capital private limited',
        'indifi capital': 'indifi capital private limited',
        'mintifi': 'mintifi',
        'wizdom': 'money view',
        'wizdomfinance': 'money view',
        'wizdomfinancemoneyview': 'money view',
        'whizdm': 'money view',
        'whizdmfinance': 'money view',
    };

    // Normalize bank names for comparison
    const normalizeBankName = (name: string): string => {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove special characters and spaces
            .replace(/bank|limited|ltd|inc|corporation|corp/g, '') // Remove common suffixes
            .trim();
    };

    const normalizedClientBank = normalizeBankName(clientBankName);

    // 1. Try mapping-based match FIRST
    const mappedName = bankNameMappings[normalizedClientBank];
    if (mappedName) {
        const mappedMatch = availableBanks.find(bank =>
            normalizeBankName(bank) === normalizeBankName(mappedName)
        );
        if (mappedMatch) return mappedMatch;
    }

    // 2. Then try exact match after normalization
    const exactMatch = availableBanks.find(bank =>
        normalizeBankName(bank) === normalizedClientBank
    );
    if (exactMatch) return exactMatch;

    // Calculate similarity scores
    const similarityScores = availableBanks.map(bank => {
        const normalizedBank = normalizeBankName(bank);

        // Safety guard
        const isIndifi = normalizedClientBank === 'indifi' || normalizedClientBank === 'indificapital';
        const isMintifi = normalizedClientBank === 'mintifi';
        const bankIsIndifi = normalizedBank === 'indifi' || normalizedBank === 'indificapital';
        const bankIsMintifi = normalizedBank === 'mintifi';

        if ((isIndifi && bankIsMintifi) || (isMintifi && bankIsIndifi)) {
            return { bank, similarity: 0 };
        }

        const distance = levenshteinDistance(normalizedClientBank, normalizedBank);
        const maxLength = Math.max(normalizedClientBank.length, normalizedBank.length);
        const similarity = 1 - (distance / maxLength);

        return { bank, similarity };
    });

    similarityScores.sort((a, b) => b.similarity - a.similarity);

    const bestMatch = similarityScores[0];
    if (bestMatch && bestMatch.similarity >= 0.7) {
        return bestMatch.bank;
    }

    return null;
};

// Levenshtein distance calculation
export const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
};
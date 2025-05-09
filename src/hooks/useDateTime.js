export function localToUTC(localDate) {
    const date = new Date(localDate);
    // Bu +3'ü -3 yaparak UTC'ye dönüştürebilirsiniz
    // Ancak getTimezoneOffset() kullanmak daha sağlıklı
    const offset = date.getTimezoneOffset() * -1; // dakika cinsinden
    date.setMinutes(date.getMinutes() - offset);
    return date;
}

// Backend'den gelen tarihe 3 saat ekle (yerel saate dönüştür)
export function utcToLocal(utcDate) {
    const date = new Date(utcDate);
    const offset = date.getTimezoneOffset() * -1; // dakika cinsinden
    date.setMinutes(date.getMinutes() + offset);
    return date;
}
/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */

export const UriUtil = {
  getDomainWithoutSuffix(uri: string) {
    const domain = uri.toLowerCase().split('/')[2];
    const regexResult = domain && /(.+?)((?:\.co)?.[a-z]{2,4})$/i.exec(domain);
    return regexResult ? regexResult[1] : null;
  },
};

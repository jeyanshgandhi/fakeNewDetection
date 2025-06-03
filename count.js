class CountVectorizer {
    constructor({ vocabulary }) {
        this.vocabulary = vocabulary;
    }

    // Transform input text into a feature vector
    transform(texts) {
        const vectors = [];
        for (const text of texts) {
            const vector = new Array(this.vocabulary.length).fill(0);
            const words = text.split(/\s+/);
            for (const word of words) {
                const index = this.vocabulary.indexOf(word);
                if (index !== -1) {
                    vector[index]++;
                }
            }
            vectors.push(vector);
        }
        return vectors;
    }
}

module.exports = { CountVectorizer };

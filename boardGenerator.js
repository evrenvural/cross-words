if (!String.prototype.includes) {
  Object.defineProperty(String.prototype, 'includes', {
    value: function (search, start) {
      if (typeof start !== 'number') {
        start = 0;
      }

      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    },
  });
}

function forEach(ary, callback, thisArg) {
  if (ary.forEach) {
    ary.forEach(callback, thisArg);
    return;
  }
  for (let i = 0; i < ary.length; i += 1) {
    callback.call(thisArg, ary[i], i, ary);
  }
}

class Word {
  constructor(data) {
    this.answer = data.answer;
    this.description = data.description || null;
    this.alt = data.alt || null;
    this.image_description = data.image_description || null;
    this.uid = data.uid ? data.uid : Math.random().toString(36).substr(2, 9);
    this.orientation = null;
    this.startX = null;
    this.startY = null;
    this.coords = [];
  }

  addCoord(coord) {
    this.coords.push(coord);
  }

  get length() {
    return this.answer.length;
  }

  getRandomOrientation() {
    this.orientation = Math.random() > 0.5 ? 'vertical' : 'horizontal';
    return this.orientation;
  }

  getRandomStartX() {
    this.startX =
      this.orientation == 'vertical'
        ? Math.floor(Math.random() * worker.grid.columns)
        : Math.floor(Math.random() * (worker.grid.columns - this.length));
    return this.startX;
  }

  getRandomStartY() {
    this.startY =
      this.orientation == 'horizontal'
        ? Math.floor(Math.random() * worker.grid.rows)
        : Math.floor(Math.random() * (worker.grid.rows - this.length));
    return this.startY;
  }
}

class Grid {
  constructor(size) {
    this.rows = size.rows;
    this.columns = size.columns;
    this.field = {};
    this.BLANK_CHAR = '@';
    this.reset();
  }

  getCellValue(y, x) {
    const id = this.getCellId(y, x);
    return this.field[id];
  }

  calculateBounds(y, x) {
    const currentCell = this.getCellValue(y, x);

    // get input values for boundaries around character
    const left = this.getCellValue(y, x - 1);
    const right = this.getCellValue(y, x + 1);
    const top = this.getCellValue(y - 1, x);
    const bottom = this.getCellValue(y + 1, x);

    return { currentCell, left, right, top, bottom };
  }

  isBlank(char) {
    return char === this.BLANK_CHAR || char === undefined;
  }

  checkHorizontalRange(y, x, word) {
    if (x < 0 || y < 0) {
      return false;
    }

    if (x + word.length > this.columns) {
      return false;
    }

    let currentOverlap = '';
    let intersects = 0;

    for (let i = 0; i < word.length; i++) {
      if (x > this.columns || y > this.rows) {
        return false;
      }
      const { top, bottom, right, left, currentCell } = this.calculateBounds(y, x);
      const currentChar = word.answer[i];
      const previousChar = word.answer[i - 1];
      const nextChar = word.answer[i + 1];

      if (currentCell === currentChar && !nextChar && !this.isBlank(right)) {
        return false;
      }

      if (currentCell === currentChar && !previousChar && !this.isBlank(left)) {
        return false;
      }

      if (currentCell === currentChar) {
        x++;
        currentOverlap += currentCell;
        intersects++;
        continue;
      }

      if (currentCell !== currentChar && !this.isBlank(currentCell)) {
        return false;
      }

      if (!this.isBlank(top) || !this.isBlank(bottom)) {
        return false;
      }

      if (!this.isBlank(left) && left !== previousChar) {
        return false;
      }

      if (!this.isBlank(right) && right !== nextChar) {
        return false;
      }

      x++;
    }

    const rangeAvailable =
      this.isFullOverlapExistingWord(currentOverlap) &&
      intersects > 0 &&
      currentOverlap.length < word.length;

    return { rangeAvailable, intersects };
  }

  isFullOverlapExistingWord(currentOverlap) {
    return worker.wordsPlaced.every((word) => word.answer != currentOverlap);
  }

  checkVerticalRange(y, x, word) {
    if (y < 0 || x < 0) {
      return false;
    }

    if (y + word.length > this.rows) {
      return false;
    }

    let currentOverlap = '';
    let intersects = 0;

    for (let i = 0; i < word.length; i++) {
      if (x > this.columns || y > this.rows) {
        return false;
      }
      const { top, bottom, left, right, currentCell } = this.calculateBounds(y, x);
      const currentChar = word.answer[i];
      const previousChar = word.answer[i - 1];
      const nextChar = word.answer[i + 1];

      if (currentCell === currentChar && !nextChar && !this.isBlank(bottom)) {
        return false;
      }

      if (currentCell === currentChar && !previousChar && !this.isBlank(top)) {
        return false;
      }

      if (currentCell === currentChar) {
        y++;
        currentOverlap += currentCell;
        intersects++;
        continue;
      }

      if (currentCell !== currentChar && !this.isBlank(currentCell)) {
        return false;
      }

      if (!this.isBlank(left) || !this.isBlank(right)) {
        return false;
      }

      if (!this.isBlank(top) && top !== previousChar) {
        return false;
      }

      if (!this.isBlank(bottom) && bottom !== nextChar) {
        return false;
      }

      y++;
    }

    const rangeAvailable =
      this.isFullOverlapExistingWord(currentOverlap) &&
      intersects > 0 &&
      currentOverlap.length < word.length;

    return { rangeAvailable, intersects };
  }

  insertWord(word) {
    const wordArr = word.answer.toLowerCase().split('');
    let xCoord = word.startX;
    let yCoord = word.startY;

    // loop through the indiv. characters and submit coordinates based on orientation
    forEach(wordArr, (value) => {
      const cellId = this.getCellId(yCoord, xCoord);
      this.setCell(cellId, value);
      word.addCoord([yCoord, xCoord]);

      if (word.orientation == 'horizontal') xCoord++;
      if (word.orientation == 'vertical') yCoord++;
    });

    // add succesfully inserted word to words in field object & increase success counter
    worker.addPlacedWord(word);
  }

  setCell(id, value) {
    this.field[id] = value;
  }

  getCellId(row, column) {
    return `${row.toString()}_${column.toString()}`;
  }

  reset() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const id = this.getCellId(y, x);
        // set to non-empty value for now
        this.field[id] = this.BLANK_CHAR;
      }
    }
  }
}

class CrosswordWorker {
  constructor(data) {
    this.wordsPlaced = [];
    this.missingWords = [];
    this.words = data.questions;
    this.rows = data.size.rows;
    this.columns = data.size.columns;
    this.totalRepeats = 5;
    this.blanks = 0;
    this.descriptionType = data.descriptionType;
    this.getDescription = this.getDescription.bind(this);

    this.words = data.questions
      .filter((question) => question && question.answer)
      .map((question) => ({
        answer: question.answer.toLowerCase(),
        description: this.getDescription(question),
        image_description:
          this.descriptionType === 'image_description' ? question.image_description : null,
        uid: question.uid,
        alt: question.alt || null,
      }))
      .map((question) => new Word(question));
    this.grid = new Grid(data.size);
  }

  getDescription(word) {
    return this.descriptionType === 'crosspatch' ? word.answer : word.description;
  }

  addPlacedWord(word) {
    this.wordsPlaced.push(word);
  }

  removeWordFromPool(uid) {
    this.words = this.words.filter((word) => word.uid !== uid);
  }

  calcOverlapWords(word1, word2) {
    const word1Arr = word1.toLowerCase().split('');
    const word2Arr = word2.toLowerCase().split('');

    // filter out all the characters that aren't found in the placed word
    const overlap = word1Arr.filter((value) => word2Arr.indexOf(value) !== -1);
    // lookup indexes of the overlapping characters within placed word
    const intersect = word2Arr.map((value, idx) =>
      overlap.indexOf(value) !== -1 ? { value: value, idx: idx } : null
    );

    // remove all the non-overlap
    return intersect.filter((currentChar) =>
      currentChar ? currentChar.value !== undefined : false
    );
  }

  calcPositionWord(homelessWord, placedWord, char) {
    const totalMatches = homelessWord.answer.split(char.value).length - 1;
    if (totalMatches == 0) return false;

    const totalAttempts = Math.floor(Math.random() * (totalMatches - 1) + 1);
    let startIndex = 0,
      homelessWordCharIndex;
    for (let i = 0; i < totalAttempts; i++) {
      homelessWordCharIndex = homelessWord.answer.indexOf(char.value, startIndex);
      startIndex = homelessWordCharIndex;
    }

    let x, y, rangeAndIntersect;
    if (placedWord.orientation === 'vertical') {
      x = placedWord.startX - homelessWordCharIndex;
      y = placedWord.startY + char.idx;
      if (y < 0 || x < 0 || x > this.columns || y > this.rows) {
        return {
          rangeAvailable: false,
          intersects: 0,
        };
      }
      rangeAndIntersect = this.grid.checkHorizontalRange(y, x, homelessWord);
    }
    if (placedWord.orientation === 'horizontal') {
      x = placedWord.startX + char.idx;
      y = placedWord.startY - homelessWordCharIndex;
      if (y < 0 || x < 0 || x > this.columns || y > this.rows) {
        return {
          rangeAvailable: false,
          intersects: 0,
        };
      }
      rangeAndIntersect = this.grid.checkVerticalRange(y, x, homelessWord);
    }

    const rangeAvailable = rangeAndIntersect ? rangeAndIntersect.rangeAvailable : false;
    const intersects = rangeAndIntersect ? rangeAndIntersect.intersects : 0;
    if (rangeAvailable && intersects) {
      homelessWord.startX = x;
      homelessWord.startY = y;
      homelessWord.orientation = placedWord.orientation === 'vertical' ? 'horizontal' : 'vertical';
    }

    return {
      word: homelessWord,
      rangeAvailable,
      intersects,
    };
  }

  getResults() {
    return {
      grid: this.grid.field,
      wordsPlaced: this.wordsPlaced,
      missingWords: this.missingWords,
      blanks: this.blanks,
      columns: this.columns,
      rows: this.rows,
    };
  }

  findCompatibleWord(homelessWord) {
    const options = [];
    // check overlap/intersection with succesfully placed words
    forEach(this.wordsPlaced, (placedWord) => {
      const overlap = this.calcOverlapWords(homelessWord.answer, placedWord.answer);
      // if(homelessWord.answer.includes(placedWord.answer)) {
      //     return
      // }

      // if(placedWord.answer.includes(homelessWord.answer)) {
      //     return
      // }

      // start with random overlap
      this.shuffle(overlap);

      // if overlap is present, then look at all the possible positions for the homeless word
      forEach(overlap, (currentChar) => {
        const checkedWord = this.calcPositionWord(homelessWord, placedWord, currentChar);
        if (checkedWord.rangeAvailable) {
          options.push(checkedWord);
        }
      });
    });
    if (options.length == 0) return;

    this.sortByIntersect(options);
    this.grid.insertWord(options[0].word);
  }

  findHomesForWords(words) {
    // loop through total word pool to find new homes for the words
    forEach(words, (homelessWord) => {
      // start with a random placed word
      this.wordsPlaced = this.shuffle(this.wordsPlaced);

      // check overlap/intersection with succesfully placed words
      if (this.wordsPlaced.every((_word) => _word.uid !== homelessWord.uid)) {
        this.findCompatibleWord(homelessWord);
      }
    });
  }

  findMissingWords() {
    return this.words.filter((missingWord) => {
      return this.wordsPlaced.every((word) => word.uid != missingWord.uid);
    });
  }

  getCellValue(y, x) {
    const id = this.grid.getCellId(y, x);
    return this.grid.field[id];
  }

  generateRandomWordSettings() {
    const idx = (Math.random() * this.words.length) | 0;
    const randomWord = this.words[idx];
    const orientation = randomWord.getRandomOrientation();
    const startX = randomWord.getRandomStartX();
    const startY = randomWord.getRandomStartY();

    return { idx, word: randomWord, orientation, startX, startY };
  }

  generateStartingWord() {
    // select random starting word & orientation
    const settings = this.generateRandomWordSettings();

    const startSettings = {
      idx: settings.idx,
      word: settings.word,
      answer: settings.word.answer,
      description: settings.word.description,
      startX: settings.startX,
      startY: settings.startY,
      orientation: settings.orientation,
      coords: [],
    };

    // insert word into field
    this.grid.insertWord(startSettings.word);

    // remove starting word from wordPool
    this.removeWordFromPool(startSettings.word.uid);
  }

  setMissingWords() {
    this.missingWords = this.findMissingWords();
  }

  sortByIntersect(options) {
    options.sort((word1, word2) => {
      // return the word with the most intersects
      const intersectDiff = Number(word2.intersects) - Number(word1.intersects);
      if (intersectDiff !== 0) return intersectDiff;

      // else return the most central word
      const vert1 = Math.abs(this.rows / 2 - word1.word.startY);
      const vert2 = Math.abs(this.rows / 2 - word2.word.startY);
      const hor1 = Math.abs(this.columns / 2 - word1.word.startX);
      const hor2 = Math.abs(this.columns / 2 - word2.word.startX);
      return vert1 + hor1 - (vert2 + hor2);
    });
  }

  shuffleWords() {
    this.words = this.shuffle(this.words);
    return this.words;
  }

  shuffle(array) {
    if (array.length <= 1) {
      return array;
    }
    let currentIndex = array === this.words ? array.length - 1 : array.length;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      const temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  tryInsertMissingWords() {
    for (let i = 0; i < this.totalRepeats; i++) {
      // stop looping if all words have been inserted
      if (this.wordsPlaced.length >= this.words.length) return;
      const missingArray = this.shuffle(this.findMissingWords());

      this.findHomesForWords(missingArray);
    }
  }
}

/* let worker = null; */

/* onmessage = (task) => {
	worker = new CrosswordWorker(task.data);
	worker.generateStartingWord();
	const words = worker.shuffleWords();
	worker.findHomesForWords(words);
	worker.tryInsertMissingWords();
	worker.setMissingWords();
	postMessage(worker.getResults());
}; */

const INPUT = {
  size: { rows: 8, columns: 8 },
  questions: [
    { answer: 'deneme', description: 'Soldan sağa 1', uid: '1', alt: 'deneme' },
    { answer: 'evren', description: 'Yukarıdan aşağı 2', uid: '2', alt: 'evren' },
  ],
};

const worker = new CrosswordWorker(INPUT);
worker.generateStartingWord();
const words = worker.shuffleWords();
worker.findHomesForWords(words);
worker.tryInsertMissingWords();
worker.setMissingWords();
console.log(worker.getResults());

const RESPONSE = {
  grid: {
    '0_0': 'E',
    '0_1': 'L',
    '0_2': 'M',
    '0_3': 'A',
    '0_4': 'A',
    '1_0': 'M',
    '1_1': 'O',
    '1_2': 'R',
    '1_3': 'I',
    '1_4': 'Ş',
    '2_0': 'İ',
    '2_1': 'R',
    '2_2': 'A',
    '2_3': 'B',
    '2_4': 'K',
    '3_0': 'R',
    '3_1': 'A',
    '3_2': 'N',
    '3_3': 'A',
    '3_4': 'A',
    '4_0': 'A',
    '4_1': 'L',
    '4_2': 'U',
    '4_3': 'L',
    '4_4': 'S',
  },
  wordsPlaced: [
    {
      answer: 'ELMA',
      description: 'Bir meyve',
      startX: 0,
      startY: 0,
      orientation: 'horizontal',
      coords: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    {
      answer: 'MOR',
      description: 'Bir renk',
      startX: 1,
      startY: 1,
      orientation: 'horizontal',
      coords: [
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    },
    {
      answer: 'ARI',
      description: 'Bir hayvan',
      startX: 2,
      startY: 2,
      orientation: 'horizontal',
      coords: [
        [2, 2],
        [2, 3],
        [2, 4],
      ],
    },
    {
      answer: 'ARABA',
      description: 'Bir araç',
      startX: 3,
      startY: 2,
      orientation: 'horizontal',
      coords: [
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
        [3, 4],
      ],
    },
    {
      answer: 'BURSA',
      description: 'Bir şehir',
      startX: 4,
      startY: 0,
      orientation: 'horizontal',
      coords: [
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
    {
      answer: 'EMİR',
      description: 'Bir eşya',
      startX: 0,
      startY: 0,
      orientation: 'vertical',
      coords: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    },
    {
      answer: 'MARUL',
      description: 'Bir sebze',
      startX: 1,
      startY: 1,
      orientation: 'vertical',
      coords: [
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
      ],
    },
    {
      answer: 'İRAN',
      description: 'Bir ülke',
      startX: 2,
      startY: 2,
      orientation: 'vertical',
      coords: [
        [2, 2],
        [3, 2],
        [4, 2],
      ],
    },
    {
      answer: 'ASİL',
      description: 'Bir sıfat',
      startX: 1,
      startY: 3,
      orientation: 'vertical',
      coords: [
        [1, 3],
        [2, 3],
        [3, 3],
        [4, 3],
      ],
    },
    {
      answer: 'AŞK',
      description: 'Bir his',
      startX: 0,
      startY: 4,
      orientation: 'vertical',
      coords: [
        [0, 4],
        [1, 4],
        [2, 4],
      ],
    },
  ],
  missingWords: [],
  blanks: 3,
  columns: 5,
  rows: 5,
};

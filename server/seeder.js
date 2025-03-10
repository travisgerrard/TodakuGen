const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Story = require('./models/Story');
const Vocabulary = require('./models/Vocabulary');
const Grammar = require('./models/Grammar');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample data
const users = [
  {
    username: 'demo',
    waniKaniLevel: 5,
    genkiChapter: 3,
    preferences: {
      storyLength: 'medium',
      maxKanjiLevel: 10,
      maxGrammarLevel: 6,
      topics: ['daily life', 'school', 'travel'],
    },
  },
];

const vocabulary = [
  {
    word: '学校',
    reading: 'がっこう',
    meaning: 'school',
    kanjiLevel: 1,
    exampleSentences: [
      {
        sentence: '私は学校に行きます。',
        translation: 'I go to school.',
      },
    ],
  },
  {
    word: '友達',
    reading: 'ともだち',
    meaning: 'friend',
    kanjiLevel: 2,
    exampleSentences: [
      {
        sentence: '彼は私の友達です。',
        translation: 'He is my friend.',
      },
    ],
  },
  {
    word: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    kanjiLevel: 1,
    exampleSentences: [
      {
        sentence: '私はご飯を食べます。',
        translation: 'I eat rice.',
      },
    ],
  },
];

const grammar = [
  {
    rule: 'は (Topic Marker)',
    genkiChapter: 1,
    explanation: 'The particle は (wa) marks the topic of a sentence.',
    examples: [
      {
        sentence: '私は学生です。',
        translation: 'I am a student.',
      },
    ],
  },
  {
    rule: 'て-form (Connecting Actions)',
    genkiChapter: 2,
    explanation: 'The て-form is used to connect multiple actions in sequence.',
    examples: [
      {
        sentence: '起きて、朝ご飯を食べます。',
        translation: 'I wake up and eat breakfast.',
      },
    ],
  },
  {
    rule: 'から (Because)',
    genkiChapter: 3,
    explanation: 'The particle から is used to express reason or cause.',
    examples: [
      {
        sentence: '忙しいから、行きません。',
        translation: 'I won\'t go because I\'m busy.',
      },
    ],
  },
];

const stories = [
  {
    title: '私の一日',
    content: `私は朝6時に起きます。朝ご飯を食べて、学校に行きます。学校で友達と話します。授業は9時から3時までです。授業の後で、図書館で勉強します。夕方、家に帰ります。晩ご飯を食べて、宿題をします。11時に寝ます。`,
    kanjiLevel: 2,
    grammarLevel: 2,
    length: 'short',
    topic: 'daily life',
  },
];

// Import data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Story.deleteMany();
    await Vocabulary.deleteMany();
    await Grammar.deleteMany();

    // Insert new data
    const createdVocabulary = await Vocabulary.insertMany(vocabulary);
    const createdGrammar = await Grammar.insertMany(grammar);

    // Add references to stories
    const vocabIds = createdVocabulary.map(v => v._id);
    const grammarIds = createdGrammar.map(g => g._id);

    const storyData = stories.map(story => {
      return {
        ...story,
        vocabulary: vocabIds.map(id => ({ wordId: id, frequency: 1 })),
        grammarPoints: grammarIds,
      };
    });

    const createdStories = await Story.insertMany(storyData);

    // Update vocabulary and grammar with story references
    for (const vocab of createdVocabulary) {
      vocab.stories = createdStories.map(s => s._id);
      await vocab.save();
    }

    for (const gram of createdGrammar) {
      gram.stories = createdStories.map(s => s._id);
      await gram.save();
    }

    // Create users
    await User.insertMany(users);

    console.log('Data imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Destroy data
const destroyData = async () => {
  try {
    await User.deleteMany();
    await Story.deleteMany();
    await Vocabulary.deleteMany();
    await Grammar.deleteMany();

    console.log('Data destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run script based on command line argument
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
} 
// Regular expressions to identify Japanese characters
const kanjiRegex = /[\u4e00-\u9faf]/g;
const kanaRegex = /[\u3040-\u309f\u30a0-\u30ff]/g;

// Common kanji-kana pairs for basic words (sample data - would need to be expanded)
const commonWords = {
  '私': 'わたし',
  '僕': 'ぼく',
  '俺': 'おれ',
  '君': 'きみ',
  '彼': 'かれ',
  '彼女': 'かのじょ',
  '人': 'ひと',
  '友達': 'ともだち',
  '学校': 'がっこう',
  '先生': 'せんせい',
  '学生': 'がくせい',
  '大学': 'だいがく',
  '会社': 'かいしゃ',
  '日本': 'にほん',
  '仕事': 'しごと',
  '時間': 'じかん',
  '今日': 'きょう',
  '明日': 'あした',
  '昨日': 'きのう',
  '今': 'いま',
  '食べる': 'たべる',
  '飲む': 'のむ',
  '見る': 'みる',
  '行く': 'いく',
  '来る': 'くる',
  '帰る': 'かえる',
  '話す': 'はなす',
  '聞く': 'きく',
  '書く': 'かく',
  '読む': 'よむ',
  '住む': 'すむ',
  '電車': 'でんしゃ',
  '車': 'くるま',
  '家': 'いえ',
  '部屋': 'へや',
  '日': 'ひ',
  '月': 'つき',
  '年': 'とし',
  '水': 'みず',
  '火': 'ひ',
  '空': 'そら',
  '海': 'うみ',
  '山': 'やま',
  '川': 'かわ',
  '道': 'みち',
  '町': 'まち',
  '市': 'し',
  '国': 'くに',
  '世界': 'せかい',
  '言葉': 'ことば',
  '名前': 'なまえ',
  '電話': 'でんわ',
  '漢字': 'かんじ',
  '日本語': 'にほんご',
  '英語': 'えいご',
  '料理': 'りょうり',
  '映画': 'えいが',
  '音楽': 'おんがく',
  '本': 'ほん',
  '手紙': 'てがみ',
  '服': 'ふく',
  '靴': 'くつ',
  '傘': 'かさ',
  '鞄': 'かばん',
  '財布': 'さいふ',
  '時計': 'とけい',
  '眼鏡': 'めがね',
  '携帯': 'けいたい',
  '携帯電話': 'けいたいでんわ',
  '食事': 'しょくじ',
  '朝食': 'ちょうしょく',
  '昼食': 'ちゅうしょく',
  '夕食': 'ゆうしょく',
  '晩御飯': 'ばんごはん',
  '家族': 'かぞく',
  '父': 'ちち',
  '母': 'はは',
  '兄': 'あに',
  '姉': 'あね',
  '弟': 'おとうと',
  '妹': 'いもうと',
  '子供': 'こども',
  '男': 'おとこ',
  '女': 'おんな',
  '男の子': 'おとこのこ',
  '女の子': 'おんなのこ',
  '一': 'いち',
  '二': 'に',
  '三': 'さん',
  '四': 'よん',
  '五': 'ご',
  '六': 'ろく',
  '七': 'なな',
  '八': 'はち',
  '九': 'きゅう',
  '十': 'じゅう',
  '百': 'ひゃく',
  '千': 'せん',
  '万': 'まん',
  '気': 'き',
  '気持ち': 'きもち'
};

/**
 * Process Japanese text to add furigana to first appearances of kanji
 * @param {string} text - Japanese text to process
 * @param {Set} seenKanji - Set of kanji that have already been seen
 * @returns {Object} Object with processed text and updated seen kanji set
 */
export const processJapaneseText = (text, seenKanji = new Set()) => {
  if (!text) return { text: '', seenKanji };

  // Find all potential words in the text
  let processedText = text;
  
  // Process multi-character words first
  Object.keys(commonWords)
    .filter(word => word.length > 1)
    .sort((a, b) => b.length - a.length) // Process longer words first
    .forEach(kanjiWord => {
      // Only add furigana if this is the first time seeing any kanji in this word
      const hasUnseenKanji = [...kanjiWord].some(char => kanjiRegex.test(char) && !seenKanji.has(char));
      
      if (hasUnseenKanji) {
        const reading = commonWords[kanjiWord];
        const pattern = new RegExp(kanjiWord, 'g');
        
        processedText = processedText.replace(pattern, (match) => {
          // Mark all kanji in this word as seen
          [...match].forEach(char => {
            if (kanjiRegex.test(char)) {
              seenKanji.add(char);
            }
          });
          
          return `<ruby>${match}<rt>${reading}</rt></ruby>`;
        });
      }
    });
  
  // Process single-character kanji
  Object.keys(commonWords)
    .filter(word => word.length === 1 && kanjiRegex.test(word))
    .forEach(kanji => {
      if (!seenKanji.has(kanji)) {
        const reading = commonWords[kanji];
        const pattern = new RegExp(kanji, 'g');
        
        processedText = processedText.replace(pattern, (match) => {
          seenKanji.add(kanji);
          return `<ruby>${match}<rt>${reading}</rt></ruby>`;
        });
      }
    });
  
  return { text: processedText, seenKanji };
};

/**
 * Process full story content with paragraphs
 * @param {string} content - Full story content with paragraphs
 * @returns {Array} Array of processed paragraphs with furigana
 */
export const processStoryContent = (content) => {
  if (!content) return [];
  
  const paragraphs = content.split('\n');
  const seenKanji = new Set();
  
  return paragraphs.map(paragraph => {
    const { text, seenKanji: updatedSeenKanji } = processJapaneseText(paragraph, seenKanji);
    
    // Update the set of seen kanji for the next paragraph
    for (const kanji of updatedSeenKanji) {
      seenKanji.add(kanji);
    }
    
    return text;
  });
};

export default {
  processJapaneseText,
  processStoryContent
}; 
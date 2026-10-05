const bcrypt = require('bcryptjs');

const hashToTest = '$2a$10$xWw7T5HqjZ7Q7kX2v1V4.ejhO5K/Xq7M/r2L/9Q1V5V0m/m5.n2K';
const isMatch = bcrypt.compareSync('123456', hashToTest);
console.log('Does 123456 match?', isMatch);

const correctHash = bcrypt.hashSync('123456', 10);
console.log('Correct hash for 123456:', correctHash);

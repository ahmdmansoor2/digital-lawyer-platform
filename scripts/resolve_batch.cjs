const https = require('https');

const urls = [
  { name: '1836_2011', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE5jO8O8_10HEXal1n2NFrrJhkyc5ZoznHxo64_2FdFo57DsfEIHAzN4SxqkRLjCoxxtwmCW8jIOQGaeUKEUn7zyEFLpNO7vhyo_rBqzjOclYAX4FCZzA==' },
  { name: '615_2016', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGeW-PddJV45nbhvmqQGLA2kiXnJMbE2amhs1ZKdFiBQd2yL6sq5wkHR8jZGnufMw94KetmWLLVgaPkLPZGrchLfL0qkTcNgxrg6WO8iP1OY6bBq_dFkg==' },
  { name: '1919_2016', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmCh0m4_3rQq3EhkiTrVnS65yrb-nOVacxYmqObCLgrVkvt9pDAtWfR9odRq4zy06v1aC_B5X3d1XfaendfCiZci-QQHkIRhovNebTTPjH3c0T5sZS5g==' },
];

urls.forEach(item => {
  https.get(item.url, res => {
    console.log(item.name, '=>', res.headers.location);
  });
});

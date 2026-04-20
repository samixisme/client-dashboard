import axios from 'axios';
import { validateUrl } from './api/urlValidator';

async function test() {
  try {
    await axios.get('http://example.com', {
      beforeRedirect: (options) => {
        console.log(options.href);
      }
    });
  } catch (e) {
    console.error(e);
  }
}
test();

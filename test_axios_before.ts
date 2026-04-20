import axios from 'axios';

async function test() {
  try {
    await axios.get('http://example.com', {
      beforeRedirect: (options: any) => {
        console.log(options.href);
      }
    });
  } catch (e: any) {
    console.error(e.message);
  }
}
test();

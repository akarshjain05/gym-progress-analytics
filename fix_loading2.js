const fs = require('fs');

function fixFile(file, searchStr, replaceStr) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('window.hideLoading')) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

fixFile('./frontend/js/weight.js', '  } catch (err) {\n    handleApiError(err);\n  }\n}', '    window.hideLoading && window.hideLoading();\n  } catch (err) {\n    handleApiError(err);\n    window.hideLoading && window.hideLoading();\n  }\n}');
fixFile('./frontend/js/nutrition.js', '  } catch (err) {\n    handleApiError(err);\n  }\n}', '    window.hideLoading && window.hideLoading();\n  } catch (err) {\n    handleApiError(err);\n    window.hideLoading && window.hideLoading();\n  }\n}');
fixFile('./frontend/js/analytics.js', '  } catch (err) {\n    handleApiError(err);\n  }\n}', '    window.hideLoading && window.hideLoading();\n  } catch (err) {\n    handleApiError(err);\n    window.hideLoading && window.hideLoading();\n  }\n}');
fixFile('./frontend/js/admin.js', '  } catch (err) {\n    console.error(err);\n    alert("Failed to load users");\n  }\n}', '    window.hideLoading && window.hideLoading();\n  } catch (err) {\n    console.error(err);\n    alert("Failed to load users");\n    window.hideLoading && window.hideLoading();\n  }\n}');


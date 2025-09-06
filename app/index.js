import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import { saveKey, getKey } from '../lib/secure';

const BACKEND_URL = 'https://tu-backend.tld'; // cambia esto por tu servidor

async function callTool(tool, args) {
  const r = await fetch(`${BACKEND_URL}/tools/${tool}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args })
  });
  if (!r.ok) throw new Error(`${tool} fallo ${r.status}`);
  return r.json();
}

export default function Home(){
  const [apiKey, setApiKey] = useState('');
  const [goal, setGoal] = useState('');
  const [log, setLog] = useState('');

  useEffect(()=>{ getKey().then(k=>k && setApiKey(k)); },[]);

  async function guardarkey(){
    if(!apiKey.startsWith('sk-')){ Alert.alert('API key inválida'); return; }
    await saveKey(apiKey);
    Alert.alert('Guardada');
  }

  async function mejorar(){
    const key = await getKey();
    if(!key){ Alert.alert('Guarda tu OpenAI API key'); return; }
    if(!goal.trim()){ Alert.alert('Escribe la mejora'); return; }

    const sys = { role:'system', content:
      'Eres un orquestador. Devuelve SOLO JSON {goal,steps:[{id,tool,args,why}],estCost}. '+
      'Herramientas permitidas: web.search, scaffold.app, repo.write, eas.build.' };
    const user = { role:'user', content:`Meta: ${goal}` };

    setLog('Planificando…');

    // 1) Pedir plan a OpenAI
    const planRes = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${key}` },
      body:JSON.stringify({ model:'gpt-4o-mini', messages:[sys,user], temperature:0 })
    });
    const j = await planRes.json();
    const planTxt = j?.choices?.[0]?.message?.content || '{}';
    let plan;
    try { plan = JSON.parse(planTxt); } catch { Alert.alert('Plan inválido'); return; }
    setLog(prev=>prev+`\nObjetivo: ${plan.goal}\nPasos: ${plan.steps?.length||0}`);

    // 2) Ejecutar cada paso automáticamente
    for (const step of plan.steps||[]) {
      setLog(prev=>prev+`\n▶ ${step.id} · ${step.tool}`);
      try {
        const out = await callTool(step.tool, step.args||{});
        setLog(prev=>prev+`\n✔ ${step.id}: ${JSON.stringify(out).slice(0,300)}`);
      } catch(e){
        setLog(prev=>prev+`\n✖ ${step.id}: ${String(e).slice(0,200)}`);
        break;
      }
    }
    setLog(prev=>prev+'\nHecho.');
  }

  return (
    <View style={{flex:1,padding:16,gap:12}}>
      <Text style={{fontSize:18,fontWeight:'600'}}>Ambi Vision</Text>

      <Text>OpenAI API key</Text>
      <TextInput value={apiKey} onChangeText={setApiKey}
        secureTextEntry placeholder="sk-..." style={{borderWidth:1,padding:8}} />
      <Button title="Guardar clave" onPress={guardarkey}/>

      <Text style={{marginTop:12}}>¿En qué mejorar?</Text>
      <TextInput value={goal} onChangeText={setGoal}
        placeholder="Ej.: publica un APK nuevo"
        style={{borderWidth:1,padding:8}} />

      <Button title="Mejorar ahora (auto)" onPress={mejorar}/>

      <Text style={{marginTop:12}}>Registro:</Text>
      <ScrollView style={{flex:1,borderWidth:1,padding:8}}>
        <Text selectable>{log}</Text>
      </ScrollView>
    </View>
  );
}